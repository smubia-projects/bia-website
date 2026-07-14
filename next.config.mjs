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
      dynamic: 0,
    },
  },
  images: {
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
