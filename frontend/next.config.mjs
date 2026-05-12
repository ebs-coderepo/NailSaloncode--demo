/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Only proxy /api/v1/* to the Express backend.
        // /api/auth/* is handled by Next.js Route Handlers (sets httpOnly cookies).
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
