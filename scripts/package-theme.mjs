import { execFileSync } from "node:child_process";
import { chmod, copyFile, lstat, mkdir, mkdtemp, readdir, rename, rm, stat, utimes } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const archive = join(dist, "cms-field-notes-theme.zip");
const roots = [
  ".env.example", "CHANGELOG.md", "LICENSE", "README.md", "app",
  "eslint.config.mjs", "kujo-theme.json", "lib", "next-env.d.ts",
  "package-lock.json", "package.json", "public", "scripts", "tests",
  "tsconfig.json", "vendor", "vite.config.ts", "worker",
];
const ignored = new Set(["node_modules", "dist", "coverage"]);
const timestamp = new Date("1980-01-01T00:00:00Z");
const entries = [];
let uncompressedBytes = 0;

async function collect(path) {
  const metadata = await lstat(join(root, path));
  if (metadata.isDirectory()) {
    for (const name of (await readdir(join(root, path))).sort()) {
      if (name.startsWith(".") || ignored.has(name)) continue;
      if (name.includes("\\") || name.includes(":") || Array.from(name).some((character) => character.charCodeAt(0) < 32)) {
        throw new Error("A package entry has an unsupported filename.");
      }
      await collect(`${path}/${name}`);
    }
    return;
  }
  if (!metadata.isFile()) throw new Error(`Package entry must be a regular file: ${path}`);
  uncompressedBytes += metadata.size;
  if (entries.length >= 2000 || uncompressedBytes > 64 * 1024 * 1024) {
    throw new Error("Theme package exceeds the CMS archive limits.");
  }
  entries.push(path);
}

for (const path of roots) await collect(path);
entries.sort();
await mkdir(dist, { recursive: true });
const staging = await mkdtemp(join(dist, ".package-"));
try {
  for (const entry of entries) {
    const target = join(staging, entry);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(root, entry), target);
    await chmod(target, 0o644);
    await utimes(target, timestamp, timestamp);
  }
  const candidate = join(staging, "cms-field-notes-theme.zip");
  execFileSync("zip", ["-q", "-X", candidate, "-@"], {
    cwd: staging, input: `${entries.join("\n")}\n`,
    stdio: ["pipe", "inherit", "inherit"], env: { PATH: process.env.PATH, TZ: "UTC" },
  });
  if ((await stat(candidate)).size > 16 * 1024 * 1024) throw new Error("Theme ZIP exceeds 16 MiB.");
  await rename(candidate, archive);
} finally {
  await rm(staging, { recursive: true, force: true });
}
process.stdout.write(`${archive}\n`);
