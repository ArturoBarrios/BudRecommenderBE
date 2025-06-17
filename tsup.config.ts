import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node18",
  sourcemap: true,
  clean: true,
  splitting: false,
  external: [
    "express",
    "cors",
    "cookie-parser",
    "graphql-tag",
    "@apollo/subgraph",
    "@apollo/server",
    "@apollo/server/express4",
    "@prisma/client",
    "graphql-upload-ts",
    "dotenv",
    "fs",
    "path",
    "url"
  ],
  onSuccess: () => {
    const from = "src/schema.graphql";
    const to = "dist/schema.graphql";
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    console.log("📄 schema.graphql copied to dist/");
  }
});
