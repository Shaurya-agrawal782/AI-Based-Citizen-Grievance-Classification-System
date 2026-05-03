/**
 * Detects and masks Personally Identifiable Information (PII) from text.
 * @param {string} text - The raw input text.
 * @returns {Object} - Result containing maskedText and detectedPII flags.
 */
const maskPII = (text) => {
  if (!text) {
    return {
      maskedText: "",
      detectedPII: {
        phone: false,
        email: false,
        idNumber: false,
        pinCode: false,
        houseNumber: false
      },
      maskingApplied: false
    };
  }

  let maskedText = text;
  const detectedPII = {
    phone: false,
    email: false,
    idNumber: false,
    pinCode: false,
    houseNumber: false
  };

  // 1. Email Masking
  // e.g. test@example.com
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  if (emailRegex.test(maskedText)) {
    detectedPII.email = true;
    maskedText = maskedText.replace(emailRegex, '[EMAIL_MASKED]');
  }

  // 2. Phone Masking (Indian format)
  // Supports formats: 9876543210, +919876543210, +91 98765-43210
  const phoneRegex = /(?:\+91[\s-]?)?(?:[6-9]\d{9}|[6-9]\d{4}[\s-]?\d{5}|[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4})\b/g;
  if (phoneRegex.test(maskedText)) {
    detectedPII.phone = true;
    maskedText = maskedText.replace(phoneRegex, '[PHONE_MASKED]');
  }

  // 3. Aadhaar-like numbers (12 digits)
  // Supports: 123456789012, 1234 5678 9012, 1234-5678-9012
  const idRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
  if (idRegex.test(maskedText)) {
    // Only flag if it's not already matched as part of a phone or other number
    // To be safe, we just replace it.
    detectedPII.idNumber = true;
    maskedText = maskedText.replace(idRegex, '[ID_MASKED]');
  }

  // 4. PIN codes (6 digit Indian style)
  // e.g. 110001
  const pinRegex = /\b[1-9][0-9]{5}\b/g;
  if (pinRegex.test(maskedText)) {
    detectedPII.pinCode = true;
    maskedText = maskedText.replace(pinRegex, '[PIN_MASKED]');
  }

  // 5. House numbers
  // Matches: House No. 45, H.No 12, H. No. 50, Flat 3B
  const houseRegex = /\b(House No\.?|H\.No\.?|H No\.?|Flat No\.?|Flat)\s*[0-9A-Za-z/-]+\b/gi;
  if (houseRegex.test(maskedText)) {
    detectedPII.houseNumber = true;
    maskedText = maskedText.replace(houseRegex, (match, p1) => {
      return `${p1} [HOUSE_NUMBER_MASKED]`;
    });
  }

  const maskingApplied = Object.values(detectedPII).some(val => val === true);

  return {
    maskedText,
    detectedPII,
    maskingApplied
  };
};

module.exports = { maskPII };
