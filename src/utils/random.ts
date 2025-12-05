
import { validatePasswordStrength } from "./password";

export function generateTempPassword(length = 12): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

  while (true) {
    let password = "";
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * chars.length);
      password += chars[idx];
    }

    // Ensure it passes our strength rules
    const err = validatePasswordStrength(password);
    if (!err) {
      return password;
    }
  }
}
