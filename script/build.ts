import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@aws-sdk/client-s3",
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  // Server bundle only. The React client is built and deployed separately
  // (Amplify Hosting via `vite build`); this process is API-only in production.
  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Maintenance scripts, bundled so they can run in the deployed container.
  //
  // `scripts/` is TypeScript and imports from `server/`, neither of which
  // reaches the runtime image — it copies only `dist`, `shared`,
  // drizzle.config.ts and the entrypoint, and installs production deps, so tsx
  // is absent too. Without this there is no way to run a one-off maintenance
  // task against staging, whose database is private to the VPC.
  //
  // Not minified: these are read when something has gone wrong, and a
  // stack trace that names real functions is worth more than the bytes.
  console.log("building maintenance scripts...");
  await esbuild({
    entryPoints: ["scripts/rewire_master_ef_exhibits.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/scripts/rewire-master-ef-exhibits.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
