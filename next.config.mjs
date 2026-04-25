/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow large server actions for media uploads
    serverActions: { bodySizeLimit: '25mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // allow any https for v1 (artist art + pfps)
    ],
  },
  async headers() {
    return [
      {
        // Snap endpoint must be CORS-open for Farcaster clients
        source: '/api/snap/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Accept' },
        ],
      },
    ];
  },
};

export default nextConfig;
