/**
 * Detects the language of the provided text.
 * @param {string} text - The input grievance text.
 * @returns {Object} - An object containing the detected language and translated text (if necessary).
 */
const detectLanguage = async (text) => {
  const devanagariRegex = /[\u0900-\u097F]/;
  const hinglishWords = ['bijli', 'pani', 'sadak', 'kachra', 'nala', 'aspatal', 'school', 'pole', 'light', 'safai', 'gandagi'];

  let language = "Unknown";
  let confidence = 0.5;
  const lowerText = text.toLowerCase();

  if (devanagariRegex.test(text)) {
    language = "Hindi";
    confidence = 0.95;
  } else {
    let hinglishMatchCount = 0;
    hinglishWords.forEach(word => {
      if (lowerText.includes(word)) {
        hinglishMatchCount++;
      }
    });

    if (hinglishMatchCount > 0) {
      language = "Hinglish";
      confidence = Math.min(0.7 + (hinglishMatchCount * 0.1), 0.95);
    } else if (text.trim().length > 0) {
      language = "English";
      confidence = 0.85; // Default confidence for English
    }
  }

  return {
    language,
    translatedText: text, // TODO: Implement future translation API here
    confidence
  };
};

module.exports = { detectLanguage };
