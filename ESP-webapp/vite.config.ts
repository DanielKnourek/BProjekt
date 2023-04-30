import { PluginOption, defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  let plugins: PluginOption[] | ReturnType<typeof viteCompression> = [];

  plugins.push(react());

  if (mode == "gz") {
    plugins.push(viteCompression());

    return {
      plugins: plugins,
      build: {
        outDir: "dist_gz",
      },
    };
  }
  return { plugins };
});
