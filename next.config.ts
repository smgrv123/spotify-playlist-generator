import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co', pathname: '/image/**' },
      // Spotify CDN hosts that serve user profile images.
      { protocol: 'https', hostname: 'mosaic.scdn.co', pathname: '/image/**' },
      { protocol: 'https', hostname: 'image-cdn-ak.spotifycdn.com', pathname: '/image/**' },
      { protocol: 'https', hostname: 'image-cdn-fa.spotifycdn.com', pathname: '/image/**' },
      // Profile images mirrored from a linked Facebook account.
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
        pathname: '/platform/profilepics/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
};

export default nextConfig;
