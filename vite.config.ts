import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import JavaScriptObfuscator from "javascript-obfuscator";

export default defineConfig({
  base: "./",
  plugins: [
    react(),

    {
      name: "obfuscator",
      apply: "build",
      enforce: "post",

      generateBundle(_, bundle) {
        if (process.env.NODE_ENV !== "production") return;

        for (const file of Object.values(bundle)) {
          if (file.type === "chunk") {
            file.code = JavaScriptObfuscator.obfuscate(file.code, {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.75,

              deadCodeInjection: true,
              deadCodeInjectionThreshold: 0.2,

              debugProtection: false,
              debugProtectionInterval: 0,

              disableConsoleOutput: true,

              identifierNamesGenerator: "hexadecimal",

              rotateStringArray: true,

              selfDefending: true,

              stringArray: true,
              stringArrayEncoding: ["rc4"],
              stringArrayThreshold: 0.75,

              transformObjectKeys: true,

              unicodeEscapeSequence: false,
            }).getObfuscatedCode();
          }
        }
      },
    },
  ],

  build: {
    minify: "terser",

    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
      },

      mangle: {
        toplevel: true,
      },
    },

    rollupOptions: {
      output: {
        manualChunks: undefined,

        entryFileNames: "[hash].js",
        chunkFileNames: "[hash].js",
        assetFileNames: "[hash].[ext]",
      },
    },
  },
});
