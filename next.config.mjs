/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
    // Image optimization settings
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
    formats: ['image/avif', 'image/webp'],
  },
  transpilePackages: ['three'],
  
  // Performance optimizations
  reactStrictMode: false, // Disable for production stability
  
  // Faster builds with SWC
  swcMinify: true,
  
  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
  
  // Experimental optimizations
  experimental: {
    // Optimize package imports - tree-shake these large packages
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      'recharts',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },
  
  // Logging - reduce noise in production
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
