import app from "./app";
import { ENV } from "./config/env";

async function startServer() {
  try {
    app.listen(ENV.PORT, () => {
      console.log(
        `[server] Inventory & Procurement API running on http://localhost:${ENV.PORT}`
      );
    });
  } catch (error) {
    console.error("[server] Failed to start server", error);
    process.exit(1);
  }
}

startServer();