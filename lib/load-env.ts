import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function loadEnv(): void {
  const envPath = path.join(repoRoot, ".env");
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
  }
}
