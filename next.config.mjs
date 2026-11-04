import { execSync } from 'node:child_process';

/** Identificador do build: versiona o cache do service worker sem edição manual (#24) */
function buildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try {
    return `${execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}-${Date.now().toString(36)}`;
  } catch {
    return Date.now().toString(36);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId(),
  },
};

export default nextConfig;
