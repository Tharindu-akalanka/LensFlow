import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
await mkdir(new URL("dist/", import.meta.url), { recursive: true });
for (const file of [
  "index.html",
  "style.css",
  "app.js",
  "core.js",
  "assets",
]) {
  await cp(
    new URL(file, import.meta.url),
    new URL(`dist/${file}`, import.meta.url),
    { recursive: true },
  );
}
console.log(`Built static demo: ${root}dist`);
