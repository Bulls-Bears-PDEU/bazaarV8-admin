import { defineConfig } from 'vite'
import { devtools } from "@tanstack/devtools-vite";

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    devtools(),
    // tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
  ],
  // The dependency tree currently holds two React copies (radix-ui and
  // @base-ui/react resolved against 19.2.4, the app against 19.3.0). Without
  // this, a component can call hooks from the copy that has no active
  // dispatcher and fail with "Cannot read properties of null (reading
  // 'useContext')". Deduping pins every import to the app's React.
  resolve: {
    dedupe: ["react", "react-dom"],
    tsconfigPaths: true,
  },
});

export default config
