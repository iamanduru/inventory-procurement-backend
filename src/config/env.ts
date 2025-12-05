import "dotenv/config";

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (!val) {
    throw new Error(`Environment variable ${key} is required.`);
  }
  return val;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "4000", 10),

  JWT_SECRET: requireEnv("JWT_SECRET", "dev-secret-change-me"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "1h",

  RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS ?? "900000",
    10
  ),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),

  EMAIL_HOST: process.env.EMAIL_HOST ?? "smtp.gmail.com",
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT ?? "587", 10),
  EMAIL_USER: process.env.EMAIL_USER ?? "",
  EMAIL_PASS: process.env.EMAIL_PASS ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || "",
  EMAIL_SECURE: (process.env.EMAIL_SECURE ?? "false").toLowerCase() === "true"
};
