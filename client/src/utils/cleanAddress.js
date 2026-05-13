const ADMIN_TERMS = ['tahsil', 'tehsil', 'district', 'division'];
const PINCODE_PATTERN = /\b\d{6}\b/g;
const COORDINATE_PAIR_PATTERN = /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/;

const CITY_ALIASES = new Map([
  ['bhopal', 'bhopal'],
  ['\u092d\u094b\u092a\u093e\u0932', 'bhopal'],
]);

const DISPLAY_ALIASES = new Map([
  ['\u092d\u094b\u092a\u093e\u0932', 'Bhopal'],
]);

const hasLatinLetters = (value) => /[a-z]/i.test(value);

const normalizeForDuplicate = (value) => {
  if (/\u092d\u094b\u092a\u093e\u0932/.test(value)) return 'bhopal';

  const compact = value
    .toLowerCase()
    .replace(PINCODE_PATTERN, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

  return CITY_ALIASES.get(compact) || compact;
};

const cleanAdministrativePart = (part) => {
  let value = part.replace(/\s+/g, ' ').trim();
  if (!value) return '';

  value = value.replace(PINCODE_PATTERN, '').replace(/\s+/g, ' ').trim();
  value = value.replace(/^[,\-\s]+|[,\-\s]+$/g, '').trim();
  if (!value) return '';

  if (/^huzur\s+(tahsil|tehsil)$/i.test(value)) return '';
  if (new RegExp(`^(${ADMIN_TERMS.join('|')})$`, 'i').test(value)) return '';

  const suffixMatch = value.match(new RegExp(`^(.+?)\\s+(${ADMIN_TERMS.join('|')})$`, 'i'));
  if (suffixMatch) {
    value = suffixMatch[1].trim();
  }

  if (/^huzur$/i.test(value)) return '';
  return DISPLAY_ALIASES.get(value) || value;
};

export function cleanDisplayAddress(address) {
  if (typeof address !== 'string') return '';

  const trimmed = address.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  if (COORDINATE_PAIR_PATTERN.test(trimmed)) return trimmed;

  const cleanedParts = trimmed
    .split(',')
    .map(cleanAdministrativePart)
    .filter(Boolean);

  const seen = new Map();
  const deduped = [];

  cleanedParts.forEach((part) => {
    const duplicateKey = normalizeForDuplicate(part);
    if (!duplicateKey) return;

    if (seen.has(duplicateKey)) {
      const existingIndex = seen.get(duplicateKey);
      if (!hasLatinLetters(deduped[existingIndex]) && hasLatinLetters(part)) {
        deduped[existingIndex] = part;
      }
      return;
    }

    seen.set(duplicateKey, deduped.length);
    deduped.push(part);
  });

  return deduped.join(', ');
}
