import { existsSync } from "node:fs";

// The live AI evaluation reads the developer's real provider keys from .env.local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
process.env.DEMO_MODE = "true";
