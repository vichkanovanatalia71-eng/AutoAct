/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@autoact/types"],
};
module.exports = nextConfig;
