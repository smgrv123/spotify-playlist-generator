import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { hostname: 'i.scdn.co' },
      // Spotify CDN hosts that serve user profile images.
      { hostname: 'mosaic.scdn.co' },
      { hostname: 'image-cdn-ak.spotifycdn.com' },
      { hostname: 'image-cdn-fa.spotifycdn.com' },
      // Profile images mirrored from a linked Facebook account.
      { hostname: 'platform-lookaside.fbsbx.com' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
};

export default nextConfig;
