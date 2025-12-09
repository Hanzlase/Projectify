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
  
  // Performance optimizations
  reactStrictMode: false, // Disable in dev for faster hot reload (enable for production)
  
  // Faster builds
  swcMinify: true,
  
  // Experimental optimizations (works with both Turbopack and Webpack)
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-label', '@radix-ui/react-slot'],
  },
};

export default nextConfig;
