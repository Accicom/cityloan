/**
 * CUIT (Código Único de Identificación Tributaria) validation utilities
 * Format: XX-XXXXXXXX-X (11 digits total)
 */

export function formatCuit(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 11 digits
  const limited = digits.substring(0, 11);
  
  // Add formatting
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 10) {
    return `${limited.substring(0, 2)}-${limited.substring(2)}`;
  } else {
    return `${limited.substring(0, 2)}-${limited.substring(2, 10)}-${limited.substring(10)}`;
  }
}

export function validateCuitFormat(cuit: string): boolean {
  const cleanCuit = cuit.replace(/\D/g, '');
  return cleanCuit.length === 11;
}

export function validateCuitChecksum(cuit: string): boolean {
  const cleanCuit = cuit.replace(/\D/g, '');
  
  if (cleanCuit.length !== 11) {
    return false;
  }
  
  const digits = cleanCuit.split('').map(Number);
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * multipliers[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;
  
  return checkDigit === digits[10];
}

export function isValidCuit(cuit: string): boolean {
  return validateCuitFormat(cuit) && validateCuitChecksum(cuit);
}

export function cleanCuit(cuit: string): string {
  return cuit.replace(/\D/g, '');
}