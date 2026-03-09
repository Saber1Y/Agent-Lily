#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const rootReadmePath = path.join(rootDir, "README.md");
const cliReadmePath = path.join(__dirname, "README.md");
const backupReadmePath = path.join(rootDir, ".README.project.backup.md");

function copyFile(from, to) {
  fs.copyFileSync(from, to);
}

function main() {
  const mode = process.argv[2];

  if (mode === "apply") {
    copyFile(rootReadmePath, backupReadmePath);
    copyFile(cliReadmePath, rootReadmePath);
    return;
  }

  if (mode === "restore") {
    if (fs.existsSync(backupReadmePath)) {
      copyFile(backupReadmePath, rootReadmePath);
      fs.unlinkSync(backupReadmePath);
    }
    return;
  }

  console.error("Usage: node bin/prepare-npm-readme.mjs <apply|restore>");
  process.exit(1);
}

main();
