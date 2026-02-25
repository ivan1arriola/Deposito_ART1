import {
  generateRandomNumber,
  generateValidationDigit,
  validateIdentificationNumber,
} from "ciuy";

export function normalizeCi(input: string) {
  return input.replace(/\D/g, "");
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

export function completeCiValidationDigit(ciWithoutDigit: string | number) {
  return generateValidationDigit(ciWithoutDigit);
}
