// scripts/compile-main.ts  ← run this before packaging
import bytenode from "bytenode";
import path from "path";
import fs from "fs";

// Compile main process JS to V8 bytecode (.jsc files)
// These are completely unreadable — not even decompilable
async function compile() {
  const files = [
    "electron/dist/main.js",
    "electron/dist/preload.js",
    "electron/dist/ipc/auth.js",
    "electron/dist/ipc/vault.js",
    "electron/dist/crypto/aes.js",
  ];

  for (const file of files) {
    await bytenode.compileFile({
      filename: file,
      output: file.replace(".js", ".jsc"),
    });
    // Replace the .js with a loader stub
    fs.writeFileSync(
      file,
      `require('bytenode'); require('${file.replace(".js", ".jsc")}');`,
    );
    console.log(`Compiled: ${file}`);
  }
}

compile();
