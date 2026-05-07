import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cricket: {
          green: "#1a5e1a",
          pitch: "#4a7c3f",
          gold: "#f5a623",
          blue: "#1e3a5f",
          red: "#dc2626",
          orange: "#f97316",
        },
        ipl: {
          mi: "#004ba0",
          csk: "#f9cd05",
          rcb: "#d4213d",
          kkr: "#3b225f",
          srh: "#ff822a",
          dc: "#004c93",
          pbks: "#ed1b24",
          rr: "#ea1a85",
          gt: "#1c1c2b",
          lsg: "#a72056",
        },
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "countdown": "countdown 1s linear infinite",
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
        "bounce-in": "bounceIn 0.6s ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
