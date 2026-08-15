#!/usr/bin/env node
/**
 * Ensures required runtime secrets exist BEFORE the app builds/starts.
 *
 * This never introduces a hardcoded secret: values are generated with a CSPRNG
 * on first use and appended to .env, which is gitignored. On a real platform
 * you set AUTH_SECRET in the environment UI and this script is a no-op.
 *
 * Runs automatically via the `prebuild` npm hook.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");

/** Secrets that must exist for the app to function, with generators. */
const REQUIRED = [
  { key: "AUTH_SECRET", generate: () => randomBytes(32).toString("hex") },
  { key: "CRON_SECRET", generate: () => randomBytes(32).toString("hex") },
];

function readEnvFile() {
  if (!existsSync(ENV_PATH)) return "";
  return readFileSync(ENV_PATH, "utf8");
}

function hasKey(contents, key) {
  return new RegExp(`^${key}=.+$`, "m").test(contents);
}

let contents = readEnvFile();
if (contents.length > 0 && !contents.endsWith("\n")) {
  writeFileSync(ENV_PATH, contents + "\n");
  contents += "\n";
}

const generated = [];

for (const { key, generate } of REQUIRED) {
  // An environment variable always wins over the file.
  if (process.env[key] && process.env[key].trim().length > 0) continue;
  if (hasKey(contents, key)) continue;

  const value = generate();
  appendFileSync(ENV_PATH, `${key}=${value}\n`);
  process.env[key] = value;
  generated.push(key);
}

if (generated.length > 0) {
  console.log(
    `[secrets] Generated ${generated.join(", ")} into .env (random per-installation, not committed).\n` +
      `[secrets] For production, set these in your platform's environment configuration instead.`
  );
} else {
  console.log("[secrets] All required secrets are configured.");
}
