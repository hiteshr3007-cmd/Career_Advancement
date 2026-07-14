import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, Next.js's root
  // inference can pick a stray package-lock.json elsewhere on disk (e.g. one
  // sitting directly in the Windows user profile folder) as the root, which
  // makes Turbopack's file watcher scan that entire directory tree instead
  // of just this project — very slow and can make the whole machine feel
  // like it's hanging.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
