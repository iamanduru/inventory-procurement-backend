
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations", // default path, but explicit is fine
  },
  datasource: {
    // This replaces `url = env("DATABASE_URL")` that used to be in schema.prisma
    url: env("DATABASE_URL"),
  },
});
