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
  },
  transpilePackages: ['three'],
  
  // Performance optimizations for development
  reactStrictMode: false, // Disable in dev for faster hot reload (enable for production)
  
  // Faster builds
  swcMinify: true,
  
  // Reduce memory usage
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-label', '@radix-ui/react-slot'],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Faster rebuilds in development
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      };
      
      // Reduce bundle size checks in dev
      config.performance = {
        hints: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
