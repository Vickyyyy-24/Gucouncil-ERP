const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../public/sdk");
const dest = path.join(__dirname, "../dist/sdk");

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}

console.log("✅ SDK DLL copied into dist/sdk");
