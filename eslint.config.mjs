import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "ailodge-infosite/**", "_curriculum/**", "_intake/**", "new_pages_to_add/**", "next-env.d.ts"],
  },
];

export default config;
