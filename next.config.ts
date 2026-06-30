import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true, // Fix #15: Habilitar modo estricto para detectar problemas de renderizado
};

export default nextConfig;
