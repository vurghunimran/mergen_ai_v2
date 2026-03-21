import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "var(--cream)",
        "orange-light": "var(--orange-light)",
        orange: "var(--orange)",
        navy: "var(--navy)",
        black: "var(--black)",
        white: "var(--white)"
      },
      fontFamily: {
        heading: ["var(--font-plus-jakarta-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-plus-jakarta-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-merriweather)", "ui-serif", "Georgia", "serif"]
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        float: {
          "0%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
          "100%": { transform: "translateY(0)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.4)" }
        },
        lineDash: {
          "0%": { strokeDashoffset: "80" },
          "100%": { strokeDashoffset: "0" }
        },
        noiseMove: {
          "0%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-4%, 3%)" },
          "100%": { transform: "translate(0, 0)" }
        }
      },
      animation: {
        "fade-up": "fade-up .8s ease forwards",
        float: "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "line-dash": "lineDash 3s linear infinite",
        noise: "noiseMove 8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
