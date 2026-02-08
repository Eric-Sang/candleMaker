import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const candlesBoardId = (env.VITE_CANDLES_BOARD_ID || "").trim() || "";
  const crmBoardId = (env.VITE_CRM_BOARD_ID || "").trim() || "";
  return {
    build: {
      outDir: "build",
    },
    plugins: [react()],
    server: {
      port: 8301,
      allowedHosts: [".apps-tunnel.monday.app"],
    },
    define: {
      "import.meta.env.VITE_CANDLES_BOARD_ID": JSON.stringify(candlesBoardId),
      "import.meta.env.VITE_CRM_BOARD_ID": JSON.stringify(crmBoardId),
    },
  };
});
