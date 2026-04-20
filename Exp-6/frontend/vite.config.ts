import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only chunk node_modules
          if (!id.includes("node_modules")) return
          
          // Group by ecosystem
          if (
            id.includes("react-dom") ||
            id.includes("/react/") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react"
          }
          
          if (
            id.includes("wagmi") ||
            id.includes("viem") ||
            id.includes("@wagmi") ||
            id.includes("@rainbow-me")
          ) {
            return "vendor-wagmi"
          }
          
          if (
            id.includes("@tanstack/react-router") ||
            id.includes("@tanstack/react-query") ||
            id.includes("@tanstack/query")
          ) {
            return "vendor-tanstack"
          }
          
          if (
            id.includes("@walletconnect") ||
            id.includes("@web3modal") ||
            id.includes("@reown") ||
            id.includes("walletconnect")
          ) {
            return "vendor-walletconnect"
          }
          
          if (
            id.includes("@coinbase") ||
            id.includes("ethers") ||
            id.includes("@eth-optimism")
          ) {
            return "vendor-eth-libs"
          }
          
          if (id.includes("framer-motion")) {
            return "vendor-motion"
          }
          
          // All other node_modules into misc
          return "vendor-misc"
        },
      },
    },
  },
})