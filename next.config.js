/** @type {import('next').NextConfig} */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { baseUrl } = require('./lib/env.cjs');

const nextConfig = {
  output: "export",
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_URL: baseUrl,
  },
}
if (process.env.NODE_ENV === 'development') {
   await setupDevPlatform();
}

export default nextConfig;
