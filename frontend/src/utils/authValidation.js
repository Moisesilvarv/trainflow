export const passwordRules = [
  { key: 'minLength', label: 'Minimo de 8 caracteres' },
  { key: 'hasUppercase', label: 'Pelo menos 1 letra maiuscula' },
  { key: 'hasLowercase', label: 'Pelo menos 1 letra minuscula' },
  { key: 'hasNumber', label: 'Pelo menos 1 numero' },
  { key: 'hasSpecial', label: 'Pelo menos 1 caractere especial' }
];

export function getPasswordChecks(password = '') {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };
}

export function isStrongPassword(password = '') {
  return Object.values(getPasswordChecks(password)).every(Boolean);
}

export function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
}

export function getFieldClass({ hasError, isValid }) {
  if (hasError) return 'border-rose-400 focus:border-rose-500 focus:ring-rose-100';
  if (isValid) return 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100';
  return '';
}
