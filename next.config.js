/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@capacitor/core",
    "@capacitor/app",
    "@capacitor/status-bar",
    "@capacitor/splash-screen",
    "@capacitor/local-notifications",
    "@capacitor/keyboard",
    "@capacitor/haptics",
    "@capacitor/network",
  ],
};

module.exports = nextConfig;
