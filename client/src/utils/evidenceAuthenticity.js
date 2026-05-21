const SESSION_FRESHNESS_WINDOW_MS = 30 * 60 * 1000;
const VERY_SHORT_CAPTURE_WINDOW_MS = 2500;

const hasCoordinates = (geoTag) => (
  Number.isFinite(Number(geoTag?.lat)) && Number.isFinite(Number(geoTag?.lng))
);

const hasTimestamp = (geoTag) => Boolean(geoTag?.capturedAt || geoTag?.evidenceCapturedAt);

const hasLandmark = (geoTag) => Boolean(String(geoTag?.landmark || '').trim());

const isFreshCapture = (capturedAt) => {
  if (!capturedAt) return false;
  const capturedTime = new Date(capturedAt).getTime();
  if (!Number.isFinite(capturedTime)) return false;
  return Math.abs(Date.now() - capturedTime) <= SESSION_FRESHNESS_WINDOW_MS;
};

const isFreshFileTimestamp = (file) => {
  if (!file?.lastModified) return true;
  return isFreshCapture(file.lastModified);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const buildEvidenceFingerprint = (file) => (
  file ? [file.name || 'evidence', file.size || 0, file.lastModified || 0].join(':') : ''
);

export const buildEvidenceFingerprintBundle = (files = []) => (
  files.map(buildEvidenceFingerprint).filter(Boolean).join('|')
);

const getFileTime = (file) => {
  const value = Number(file?.lastModified);
  return Number.isFinite(value) ? value : 0;
};

const loadImageForAnalysis = (imageFile, previewUrl = '') => new Promise((resolve, reject) => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    reject(new Error('Canvas image analysis is unavailable in this environment'));
    return;
  }

  const objectUrl = !previewUrl && imageFile ? URL.createObjectURL(imageFile) : '';
  const image = new Image();
  image.onload = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    reject(new Error('Image could not be loaded for spoof analysis'));
  };
  image.src = previewUrl || objectUrl;
});

const getImageDimensions = async (file) => {
  const image = await loadImageForAnalysis(file);
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
};

const compareFirstTwoFrames = async (files = []) => {
  const [first, second] = files.filter(Boolean);
  if (!first || !second) {
    return {
      similar: false,
      sameDimensions: false,
      smallSizeDelta: false,
      veryShortInterval: false,
    };
  }

  const firstSize = Number(first.size);
  const secondSize = Number(second.size);
  const firstTime = getFileTime(first);
  const secondTime = getFileTime(second);
  const veryShortInterval = firstTime > 0
    && secondTime > 0
    && Math.abs(secondTime - firstTime) <= VERY_SHORT_CAPTURE_WINDOW_MS;

  const smallSizeDelta = Number.isFinite(firstSize)
    && Number.isFinite(secondSize)
    && firstSize > 0
    && Math.abs(firstSize - secondSize) / firstSize <= 0.03;

  let sameDimensions = false;
  try {
    const [firstDimensions, secondDimensions] = await Promise.all([
      getImageDimensions(first),
      getImageDimensions(second),
    ]);
    sameDimensions = Math.abs(firstDimensions.width - secondDimensions.width) <= 2
      && Math.abs(firstDimensions.height - secondDimensions.height) <= 2;
  } catch {
    sameDimensions = true;
  }

  return {
    similar: smallSizeDelta && sameDimensions && veryShortInterval,
    sameDimensions,
    smallSizeDelta,
    veryShortInterval,
  };
};

const analyzeBrightness = async (file, previewUrl = '') => {
  const image = await loadImageForAnalysis(file, previewUrl);
  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const sampleWidth = 96;
  const sampleHeight = clamp(Math.round((sourceHeight / sourceWidth) * sampleWidth), 1, 128);
  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

  let brightnessTotal = 0;
  let veryBrightPixels = 0;
  const pixelCount = sampleWidth * sampleHeight;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);
    brightnessTotal += brightness;
    if (brightness >= 238) veryBrightPixels += 1;
  }

  const averageBrightness = brightnessTotal / pixelCount;
  const veryBrightPixelPercentage = veryBrightPixels / pixelCount;

  return {
    averageBrightness,
    veryBrightPixelPercentage,
    highGlare: averageBrightness >= 215 || veryBrightPixelPercentage >= 0.12,
  };
};

export async function detectScreenReplayRisk({
  files = [],
  challengeCompleted = false,
  geoTag = null,
  imageFile = null,
  previewUrl = '',
  evidenceFiles = [],
} = {}) {
  const evidenceFilesList = (Array.isArray(files) && files.length ? files : evidenceFiles).filter(Boolean);
  const analysisFile = imageFile || evidenceFilesList[0] || null;
  const warnings = [];
  const signals = [];
  let risk = 0;

  if (evidenceFilesList.length < 2) {
    risk += 30;
    signals.push('singleFrameOnly');
    warnings.push('Only one frame captured. Screen/photo replay cannot be ruled out.');
  }

  if (!challengeCompleted) {
    risk += 25;
    signals.push('challengeNotCompleted');
    warnings.push('Random live challenge not completed.');
  }

  if (!hasCoordinates(geoTag)) {
    risk += 20;
    signals.push('gpsMissing');
    warnings.push('GPS metadata missing.');
  }

  if (hasCoordinates(geoTag) && Number(geoTag?.accuracy) > 100) {
    risk += 10;
    signals.push('gpsAccuracyLow');
    warnings.push('GPS accuracy is low/moderate.');
  }

  const similarity = await compareFirstTwoFrames(evidenceFilesList);
  if (similarity.similar) {
    risk += 20;
    signals.push('similarFrames');
    warnings.push('Captured frames appear very similar. Capture wider scene.');
  }

  if (analysisFile) {
    try {
      const brightness = await analyzeBrightness(analysisFile, previewUrl);
      if (brightness.highGlare) {
        risk += 15;
        signals.push('possibleScreenGlare');
        warnings.push('Possible screen glare detected.');
      }
    } catch {
      signals.push('canvasAnalysisUnavailable');
      warnings.push('Canvas image analysis was unavailable for this capture.');
    }
  }

  if (!challengeCompleted && risk < 30) risk = 30;

  const spoofScore = clamp(Math.round(risk), 0, 100);
  const screenSpoofRisk = spoofScore >= 60 ? 'High' : spoofScore >= 30 ? 'Medium' : 'Low';

  if (screenSpoofRisk === 'Low' && signals.length === 0) {
    signals.push('No screen replay signal detected');
  }

  return {
    screenSpoofRisk,
    spoofScore,
    warnings,
    signals,
  };
}

export function analyzeEvidenceWithVisionAI() {
  return {
    status: 'Pending',
    message: 'Vision AI evidence forensics hook is not enabled yet.',
  };
}

export function calculateEvidenceAuthenticity({
  evidenceFiles = [],
  geoTag = null,
  challengeCompleted = false,
  usedLiveCamera = false,
  duplicateRisk = false,
  aiRelevance = 'Pending',
  screenSpoofRisk = 'Low',
  spoofScore = 0,
  spoofSignals = [],
  spoofWarnings = [],
} = {}) {
  const files = Array.isArray(evidenceFiles) ? evidenceFiles.filter(Boolean) : [];
  const signals = [];
  const warnings = [];
  const filesLookFresh = files.every(isFreshFileTimestamp);
  let score = 0;

  if (usedLiveCamera && filesLookFresh) {
    score += 20;
    signals.push('Live camera capture used');
  } else if (usedLiveCamera) {
    warnings.push('Image file timestamp looks older than this capture session');
  } else {
    warnings.push('Live camera capture was not confirmed');
  }

  if (hasCoordinates(geoTag)) {
    score += 15;
    signals.push('GPS attached');
  } else {
    warnings.push('GPS coordinates missing or denied');
  }

  if (hasTimestamp(geoTag)) {
    score += 10;
    signals.push('Timestamp recorded');
  } else {
    warnings.push('Capture timestamp is missing');
  }

  if (challengeCompleted) {
    score += 20;
    signals.push('Random live challenge completed');
  } else {
    warnings.push('Random live challenge not completed');
  }

  if (files.length >= 2) {
    score += 15;
    signals.push('Two evidence photos captured');
  } else {
    warnings.push('Only one evidence photo captured');
  }

  if (hasLandmark(geoTag)) {
    score += 10;
    signals.push('Landmark present');
  } else {
    warnings.push('Nearby landmark or signboard not confirmed');
  }

  if (screenSpoofRisk === 'Low') {
    score += 10;
    signals.push('Screen replay risk low');
  } else if (screenSpoofRisk === 'Medium') {
    warnings.push('Screen/photo replay risk needs manual review');
  } else if (screenSpoofRisk === 'High') {
    warnings.push('Possible screen/photo replay detected');
  }

  if (duplicateRisk === true) {
    warnings.push('Duplicate image risk flagged');
  } else if (duplicateRisk === false) {
    signals.push('Duplicate fingerprint generated');
  }

  if (String(aiRelevance).toLowerCase() === 'high') {
    signals.push('AI visual relevance high');
  } else if (String(aiRelevance).toLowerCase() === 'pending') {
    warnings.push('AI visual relevance check pending');
  }

  spoofWarnings.forEach((warning) => {
    if (warning && !warnings.includes(warning)) warnings.push(warning);
  });

  let scoreCap = 100;
  if (screenSpoofRisk === 'High') scoreCap = Math.min(scoreCap, 45);
  if (screenSpoofRisk === 'Medium') scoreCap = Math.min(scoreCap, 65);
  if (files.length < 2) scoreCap = Math.min(scoreCap, 65);
  if (!challengeCompleted) scoreCap = Math.min(scoreCap, 65);

  const cappedScore = clamp(Math.round(Math.min(score, scoreCap)), 0, 100);
  let status = cappedScore >= 85
    ? 'Verified Live Evidence'
    : cappedScore >= 65
      ? 'Strong Evidence - Review Recommended'
      : cappedScore >= 45
        ? 'Needs Manual Verification'
        : 'Suspicious Evidence';

  if ((!challengeCompleted || files.length < 2) && cappedScore >= 45) {
    status = 'Needs Manual Verification';
  }

  const riskLevel = cappedScore >= 85 ? 'low' : cappedScore >= 65 ? 'medium' : cappedScore >= 45 ? 'medium' : 'high';

  return {
    score: cappedScore,
    status,
    riskLevel,
    screenSpoofRisk,
    spoofScore,
    spoofSignals,
    spoofWarnings,
    signals,
    warnings,
  };
}
