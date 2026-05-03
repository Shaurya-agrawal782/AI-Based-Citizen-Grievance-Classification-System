const { maskPII } = require('../services/privacy/piiMasker');

const runPrivacyTests = () => {
  console.log('Starting PII Masking Tests...\n');

  const testCases = [
    {
      name: "Phone Number (10 digits)",
      input: "My number is 9876543210 please call me."
    },
    {
      name: "Phone Number (+91 format)",
      input: "Contact me at +91 98765-43210 immediately."
    },
    {
      name: "Email Address",
      input: "Send updates to test.user@gmail.com or admin@civictrust.in"
    },
    {
      name: "Aadhaar-like ID",
      input: "My ID is 1234 5678 9012 for verification."
    },
    {
      name: "PIN Code",
      input: "I live in Delhi 110001."
    },
    {
      name: "House Number",
      input: "There is an issue near House No. 45 and Flat 3B."
    },
    {
      name: "Mixed PII Complaint",
      input: "My phone number is 9876543210 and email is test@example.com. House No. 45 ke paas bijli ka pole spark kar raha hai. PIN 400001."
    },
    {
      name: "Clean Complaint (No PII)",
      input: "The street light on Main Road is not working."
    }
  ];

  testCases.forEach((tc, idx) => {
    console.log(`--- Test Case ${idx + 1}: ${tc.name} ---`);
    console.log(`Original: "${tc.input}"`);
    const result = maskPII(tc.input);
    console.log(`Masked:   "${result.maskedText}"`);
    console.log(`PII Detected:`, result.detectedPII);
    console.log(`Masking Applied: ${result.maskingApplied}\n`);
  });
};

runPrivacyTests();
