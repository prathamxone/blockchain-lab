#!/usr/bin/env node

import { execSync } from "node:child_process";

const checks = [
  { label: "Node", cmd: "node -v" },
  { label: "npm", cmd: "npm -v" },
  { label: "TypeScript", cmd: "npx tsc -v" },
  { label: "Prisma", cmd: "npx prisma -v" }
];

let hasFailure = false;

for (const check of checks) {
  try {
    const output = execSync(check.cmd, { stdio: ["ignore", "pipe", "pipe"] })
      .toString()
      .trim();
    console.log(`[ok] ${check.label}: ${output}`);
  } catch (error) {
    hasFailure = true;
    console.error(`[fail] ${check.label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (hasFailure) {
  process.exitCode = 1;
} else {
  console.log("Dependency baseline check passed.");
}
