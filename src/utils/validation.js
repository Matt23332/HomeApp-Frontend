export function validateEmail(email) {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return null;
}

export function validateName(name) {
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters';
  return null;
}

export function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['#ff4444', '#ff8844', '#ffcc00', '#44cc44', '#00aa00'];

export function passwordStrengthLabel(score) {
  return STRENGTH_LABELS[Math.min(score, STRENGTH_LABELS.length - 1)];
}

export function passwordStrengthColor(score) {
  return STRENGTH_COLORS[Math.min(score, STRENGTH_COLORS.length - 1)];
}

export function passwordsMatch(password, confirmation) {
  return !!password && password === confirmation;
}
