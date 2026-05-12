/** @type {import('next').NextConfig} */
function apiBase() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  // Ensure the URL always has a protocol so Next.js rewrites don't reject it.
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://${raw}`;
}

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase()}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
