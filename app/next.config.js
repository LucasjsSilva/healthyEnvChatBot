/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com']
  },
  async rewrites() {
    // Proxy Flask API routes so the frontend can use baseUrl = ''
    const apiPaths = [
      '/datasets',
      '/metrics',
      '/requests',
      '/auth/github_token',
      '/chat',
    ]
    return apiPaths.flatMap((p) => [
      { source: p, destination: `${API_URL}${p}` },
      { source: `${p}/:path*`, destination: `${API_URL}${p}/:path*` },
    ])
  },
}

module.exports = nextConfig
