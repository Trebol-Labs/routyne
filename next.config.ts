import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^\/api\/media\/.+$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "routyne-media-metadata",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/v2\.exercisedb\.io\/.+$/,
        handler: "CacheFirst",
        options: {
          cacheName: "routyne-media-gifs",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v2.exercisedb.io',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
