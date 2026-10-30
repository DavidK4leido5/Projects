export type PasswordStrength = {
  score: number;
  label: "Too short" | "Weak" | "Fair" | "Good" | "Strong";
};

/** Cheap, predictable hint. Better Auth still owns the real password rules. */
export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (password.length > 0 && password.length < 8) {
    return { score: 0, label: "Too short" };
  }

  const capped = Math.min(score, 4);
  const label = (["Too short", "Weak", "Fair", "Good", "Strong"] as const)[capped] ?? "Weak";
  return { score: capped, label };
}
