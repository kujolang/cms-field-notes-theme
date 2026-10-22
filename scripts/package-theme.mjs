import { execFileSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const archive = resolve(dist, "cms-field-notes-theme.zip");
await mkdir(dist, { recursive: true });
await rm(archive, { force: true });
const files = ["app", "lib", "public", "worker", ".env.example", "eslint.config.mjs", "kujo-theme.json", "LICENSE", "CHANGELOG.md", "next-env.d.ts", "package.json", "package-lock.json", "vendor", "tests", "scripts", "README.md", "tsconfig.json", "vite.config.ts"];
execFileSync("zip", ["-qr", archive, ...files, "-x", "*.DS_Store"], { cwd: root, stdio: "inherit" });
process.stdout.write(`${archive}\n`);
