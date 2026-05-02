const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email = '') {
  return emailRegex.test(String(email).trim().toLowerCase());
}

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
  const checks = getPasswordChecks(password);
  return Object.values(checks).every(Boolean);
}
