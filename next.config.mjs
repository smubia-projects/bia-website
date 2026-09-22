/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/AILodge",
        destination: "https://ailodge.smubia.com",
        permanent: true,
      },
      {
        source: "/ailodge",
        destination: "https://ailodge.smubia.com",
        permanent: true,
      },
      {
        source: "/ai-lodge",
        destination: "https://ailodge.smubia.com",
        permanent: true,
      },
      {
        source: "/Events",
        destination: "/Curriculum",
        permanent: true,
      },
      {
        source: "/WhatWeDo",
        destination: "/Curriculum",
        permanent: true,
      },
      {
        source: "/Datathon",
        destination: "/Curriculum",
        permanent: true,
      },
    ];
  },
  experimental: {
    staleTimes: {
      // Client-side router cache TTL (seconds). Kept long to reuse RSC
      // payloads across in-session navigations and cut function invocations.
      dynamic: 1209600,
    },
  },
  images: {
    // Cache optimized image variants for 30 days so the same source image
    // is not re-transformed (and re-billed) after a short expiry window.
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ssvs8thfuktvqsqk.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "qhh4bvxlfvehohvd.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "thisisformygif.s3.ap-southeast-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
