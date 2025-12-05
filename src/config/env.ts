import dotenv from 'dotenv';
 dotenv.config();

 function requireEnv(name: string): string {
    const value = process.env[name];
    if(!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
 }

 export const ENV = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT || "4000", 10),
    DATABASE_URL: requireEnv("DATABASE_URL"),
    JWT_SECRET: requireEnv("JWT_SECRET"),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "100", 10)
};

//Ensures we don't silently start with broken config