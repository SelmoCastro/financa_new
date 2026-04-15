#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const version = rootPkg.version;

const files = [
  { filePath: path.join(ROOT, "backend", "package.json"), field: "version" },
  { filePath: path.join(ROOT, "frontend", "package.json"), field: "version" },
  { filePath: path.join(ROOT, "mobile", "package.json"), field: "version" },
  { filePath: path.join(ROOT, "mobile", "app.json"), field: "expo.version" },
];

for (const { filePath, field } of files) {
  const content = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(content);

  const parts = field.split(".");
  let target = data;
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]];
  }
  const lastKey = parts[parts.length - 1];

  if (target[lastKey] === version) {
    console.log(`  [skip] ${path.relative(ROOT, filePath)} already at ${version}`);
    continue;
  }

  target[lastKey] = version;

  const indent = filePath.endsWith("app.json") ? 2 : 2;
  fs.writeFileSync(filePath, JSON.stringify(data, null, indent) + "\n", "utf8");
  console.log(`  [sync] ${path.relative(ROOT, filePath)} → ${version}`);
}

console.log(`\nAll packages synced to v${version}`);