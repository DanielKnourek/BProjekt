import { PluginOption, ResolveFn, defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import viteCompression from "vite-plugin-compression";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  let plugins: PluginOption[] | ReturnType<typeof viteCompression> = [];
  plugins.push(react(), tsconfigPaths(), viteSingleFile());

  if (mode == "gz") {
    plugins.push(viteCompression());

    return {
      plugins: plugins,
      build: {
        outDir: "dist_gz",
      },
    };
  }

  return {
    plugins,
  };
});
