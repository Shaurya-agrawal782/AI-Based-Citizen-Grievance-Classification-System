const SESSION_FRESHNESS_WINDOW_MS = 30 * 60 * 1000;

const hasCoordinates = (geoTag) => (
  Number.isFinite(Number(geoTag?.lat)) && Number.isFinite(Number(geoTag?.lng))
);

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

const loadImageForAnalysis = (imageFile, previewUrl) => new Promise((resolve, reject) => {
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
  const image = await loadImageForAnalysis(file, '');
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
};

const compareFrameSimilarity = async (files = []) => {
  const validFiles = files.filter(Boolean);
  if (validFiles.length < 2) return false;

  const [first, second] = validFiles;
  const firstFingerprint = buildEvidenceFingerprint(first);
  const secondFingerprint = buildEvidenceFingerprint(second);
  if (firstFingerprint && firstFingerprint === secondFingerprint) return true;

  const firstSize = Number(first.size);
  const secondSize = Number(second.size);
  if (!Number.isFinite(firstSize) || !Number.isFinite(secondSize) || firstSize === 0) return false;

  const sizeDeltaRatio = Math.abs(firstSize - secondSize) / firstSize;
  if (sizeDeltaRatio > 0.01) return false;

  try {
    const [firstDimensions, secondDimensions] = await Promise.all([
      getImageDimensions(first),
      getImageDimensions(second),
    ]);
    const sameDimensions = Math.abs(firstDimensions.width - secondDimensions.width) <= 2
      && Math.abs(firstDimensions.height - secondDimensions.height) <= 2;
    return sameDimensions;
  } catch {
    return first.lastModified === second.lastModified;
  }
};

export async function detectScreenSpoofRisk({
  imageFile = null,
  previewUrl = '',
  evidenceFiles = [],
  challengeCompleted = false,
} = {}) {
  const files = Array.isArray(evidenceFiles) ? evidenceFiles.filter(Boolean) : [];
  const signals = [];
  const warnings = [];
  let spoofScore = 0;

  if (!challengeCompleted) {
    spoofScore += 20;
    signals.push('challengeNotCompleted');
    warnings.push('Random challenge not completed, so replay risk is harder to rule out.');
  }

  if (files.length < 2) {
    spoofScore += 18;
    signals.push('singleFrameOnly');
    warnings.push('Only one evidence frame captured.');
  }

  if (await compareFrameSimilarity(files)) {
    spoofScore += challengeCompleted ? 14 : 20;
    signals.push('possibleDuplicateFrame');
    warnings.push('Multiple evidence frames look too similar. Capture from another angle.');
  }

  try {
    const image = await loadImageForAnalysis(imageFile, previewUrl);
    const canvas = document.createElement('canvas');
    const sampleWidth = 96;
    const scale = sampleWidth / Math.max(1, image.naturalWidth || image.width);
    const sampleHeight = clamp(Math.round((image.naturalHeight || image.height) * scale), 1, 128);
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
    const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

    let sum = 0;
    let sumSquares = 0;
    let overBright = 0;
    let veryDark = 0;
    let saturated = 0;
    let adjacentDiffTotal = 0;
    let highFrequencyEdges = 0;
    let edgeSamples = 0;

    const luminance = new Float32Array(sampleWidth * sampleHeight);
    for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      const brightness = (0.299 * red) + (0.587 * green) + (0.114 * blue);
      luminance[pixel] = brightness;
      sum += brightness;
      sumSquares += brightness * brightness;
      if (brightness > 242) overBright += 1;
      if (brightness < 18) veryDark += 1;
      if (Math.max(red, green, blue) - Math.min(red, green, blue) > 105) saturated += 1;
    }

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const current = luminance[(y * sampleWidth) + x];
        if (x + 1 < sampleWidth) {
          const diff = Math.abs(current - luminance[(y * sampleWidth) + x + 1]);
          adjacentDiffTotal += diff;
          highFrequencyEdges += diff > 45 ? 1 : 0;
          edgeSamples += 1;
        }
        if (y + 1 < sampleHeight) {
          const diff = Math.abs(current - luminance[((y + 1) * sampleWidth) + x]);
          adjacentDiffTotal += diff;
          highFrequencyEdges += diff > 45 ? 1 : 0;
          edgeSamples += 1;
        }
      }
    }

    const pixelCount = sampleWidth * sampleHeight;
    const mean = sum / pixelCount;
    const variance = Math.max(0, (sumSquares / pixelCount) - (mean * mean));
    const standardDeviation = Math.sqrt(variance);
    const glareRatio = overBright / pixelCount;
    const darkRatio = veryDark / pixelCount;
    const saturationRatio = saturated / pixelCount;
    const averageEdgeDiff = adjacentDiffTotal / Math.max(1, edgeSamples);
    const highEdgeRatio = highFrequencyEdges / Math.max(1, edgeSamples);
    const aspectRatio = (image.naturalWidth || image.width) / Math.max(1, image.naturalHeight || image.height);
    const screenshotLikeAspect = (
      Math.abs(aspectRatio - (9 / 16)) < 0.025
      || Math.abs(aspectRatio - (9 / 19.5)) < 0.025
      || Math.abs(aspectRatio - (16 / 9)) < 0.025
      || Math.abs(aspectRatio - (4 / 3)) < 0.015
    );

    if (glareRatio > 0.16 && standardDeviation > 42) {
      spoofScore += 24;
      signals.push('possibleScreenReflection');
      warnings.push('Large bright glare regions detected, which can happen when photographing another screen.');
    } else if (glareRatio > 0.08 && (saturationRatio > 0.18 || darkRatio > 0.08)) {
      spoofScore += 14;
      signals.push('possibleScreenReflection');
      warnings.push('Bright reflection-like regions detected.');
    }

    if (highEdgeRatio > 0.34 && averageEdgeDiff > 34) {
      spoofScore += 18;
      signals.push('possibleMoirePattern');
      warnings.push('Fine high-frequency pattern detected, which may indicate screen capture or display scan lines.');
    }

    if (standardDeviation < 24 && averageEdgeDiff < 12) {
      spoofScore += 22;
      signals.push('possibleFlatImageReplay');
      warnings.push('Image appears unusually flat or low-detail for a live scene.');
    } else if (standardDeviation < 32 && screenshotLikeAspect) {
      spoofScore += 12;
      signals.push('possibleFlatImageReplay');
      warnings.push('Image dimensions and low variation look screenshot-like.');
    }

    if (screenshotLikeAspect && files.length < 2 && !challengeCompleted) {
      spoofScore += 8;
      signals.push('lowContextCapture');
      warnings.push('Single frame has limited context; a wider challenged scene is recommended.');
    }
  } catch {
    spoofScore += 8;
    signals.push('lowContextCapture');
    warnings.push('Screen spoof analysis could not inspect image pixels in this browser.');
  }

  const cappedSpoofScore = clamp(Math.round(spoofScore), 0, 100);
  const screenSpoofRisk = cappedSpoofScore >= 60 ? 'High' : cappedSpoofScore >= 30 ? 'Medium' : 'Low';

  if (screenSpoofRisk === 'Low' && signals.length === 0) {
    signals.push('No screen replay signal detected');
  }

  // TODO: In production, Gemini Vision or a specialized image-forensics model can verify whether
  // the evidence appears to be a real scene, phone screen replay, or unrelated image.
  return {
    screenSpoofRisk,
    spoofScore: cappedSpoofScore,
    signals,
    warnings,
  };
}

export function analyzeEvidenceWithVisionAI() {
  // In production, Gemini Vision or a specialized image-forensics model can verify whether
  // the evidence appears to be a real scene, phone screen replay, or unrelated image.
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
    score += 25;
    signals.push('Live camera capture used');
  } else if (usedLiveCamera) {
    warnings.push('Image file timestamp looks older than this capture session');
  } else {
    warnings.push('Live camera capture was not confirmed');
  }

  if (hasCoordinates(geoTag)) {
    score += 20;
    signals.push('GPS attached');
  } else {
    warnings.push('GPS coordinates missing or denied');
  }

  if (Number(geoTag?.accuracy) <= 100) {
    score += 10;
    signals.push('GPS accuracy within 100m');
  } else if (geoTag?.accuracy != null) {
    warnings.push('GPS accuracy is above 100m');
  }

  if (isFreshCapture(geoTag?.capturedAt || geoTag?.evidenceCapturedAt)) {
    score += 15;
    signals.push('Timestamp recorded in current session');
  } else {
    warnings.push('Capture timestamp is missing or stale');
  }

  if (challengeCompleted) {
    score += 15;
    signals.push('Random challenge completed');
  } else {
    warnings.push('Random challenge not completed');
  }

  if (files.length >= 2) {
    score += 10;
    signals.push('Multiple evidence frames captured');
  } else {
    warnings.push('Only one evidence frame captured');
  }

  if (duplicateRisk === false) {
    score += 5;
    signals.push('Duplicate fingerprint generated');
    warnings.push('Duplicate image database check pending');
  } else if (duplicateRisk === true) {
    warnings.push('Duplicate image risk flagged');
  } else {
    warnings.push('Duplicate check pending');
  }

  if (String(aiRelevance).toLowerCase() === 'high') {
    score += 10;
    signals.push('AI visual relevance high');
  } else if (String(aiRelevance).toLowerCase() === 'pending') {
    warnings.push('AI visual relevance check pending');
  } else {
    warnings.push('AI visual relevance is not confirmed');
  }

  if (files.length < 2 || !challengeCompleted) {
    warnings.push('Replay risk remains higher without challenge-angle evidence');
  }

  if (!filesLookFresh) {
    warnings.push('Possible reused photo or screen/photo replay indicator');
  }

  if (screenSpoofRisk === 'High') {
    score -= 25;
    warnings.push('Possible screen/photo replay detected. Manual verification recommended.');
  } else if (screenSpoofRisk === 'Medium') {
    score -= 10;
    warnings.push('Screen/photo replay risk needs manual review.');
  }

  spoofWarnings.forEach((warning) => {
    if (warning && !warnings.includes(warning)) warnings.push(warning);
  });

  const cappedScore = Math.min(100, Math.max(0, score));
  const status = cappedScore >= 80
    ? 'Verified Live Evidence'
    : cappedScore >= 50
      ? 'Needs Review'
      : 'Suspicious Evidence';
  const riskLevel = cappedScore >= 80 ? 'low' : cappedScore >= 50 ? 'medium' : 'high';

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
