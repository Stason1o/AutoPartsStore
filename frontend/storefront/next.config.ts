import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:8090';

const nextConfig: NextConfig = {
  // standalone: самодостаточная сборка для запуска на VPS обычным `node server.js`
  output: 'standalone',
  async rewrites() {
    // клиентские запросы идут same-origin на /api и проксируются в бэкенд
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
