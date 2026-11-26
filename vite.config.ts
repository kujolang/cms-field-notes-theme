import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import vinext from "vinext";
import { defineConfig, loadEnv } from "vite";

const deliveryBindings = ["CMS_BASE_URL", "SITE_URL"];

function localBindings() {
  const environment = process.env.CLOUDFLARE_ENV;
  const files = [...(environment && /^[a-z0-9_-]+$/i.test(environment) ? [`.dev.vars.${environment}`] : []), ".dev.vars"];
  const explicitFile = files.find((file) => existsSync(file));
  const values = explicitFile
    ? parseEnv(readFileSync(explicitFile, "utf8"))
    : loadEnv(environment ?? "development", process.cwd(), deliveryBindings);
  return deliveryBindings.filter((name) => Boolean(values[name]));
}

export default defineConfig(async ({ command, isPreview }) => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: {
          main: "./worker/index.ts",
          compatibility_flags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
          secrets: { required: command === "serve" && !isPreview ? localBindings() : [] },
        },
      }),
    ],
  };
});
