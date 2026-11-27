import {
  generateRandomNumber,
  generateValidationDigit,
  validateIdentificationNumber,
} from "ciuy";

export function normalizeCi(input: string) {
  return input.replace(/\D/g, "");
}

export function formatUruguayanCi(input: string) {
  const digits = normalizeCi(input);
  if (digits.length < 2 || digits.length > 8) return input;

  const body = digits.slice(0, -1).padStart(7, "0");
  const checkDigit = digits.slice(-1);

  return `${body.slice(0, 1)}.${body.slice(1, 4)}.${body.slice(4, 7)}-${checkDigit}`;
}

export function isValidUruguayanCi(input: string) {
  const digits = normalizeCi(input);
  if (digits.length < 2 || digits.length > 8) return false;

  if (digits.length >= 7) {
    return validateIdentificationNumber(digits);
  }

  const body = digits.slice(0, -1);
  const checkDigit = Number(digits.slice(-1));
  if (Number.isNaN(checkDigit)) return false;

  const expected = generateValidationDigit(body);
  return expected === checkDigit;
}

export function generateRandomUruguayanCi() {
  return generateRandomNumber();
}

export function generatePlaceholderUruguayanCi() {
  return generateRandomUruguayanCi();
}