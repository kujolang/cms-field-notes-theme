import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig(async () => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: {
          main: "./worker/index.ts",
          compatibility_flags: ["nodejs_compat"],
          vars: Object.fromEntries(["CMS_BASE_URL"].map((name) => [name, process.env[name]]).filter((entry): entry is [string, string] => Boolean(entry[1]))),
        },
      }),
    ],
  };
});
