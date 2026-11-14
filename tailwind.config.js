/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: { 950: "#0b0a14", 900: "#120f22", 800: "#1b1733", 700: "#272148", 600: "#352c5f" },
        indigoink: "#2a2e6e",
        arcane: { 300: "#c9b8ff", 400: "#a98bff", 500: "#8a63f0", 600: "#6c45d6" },
        gold: { 200: "#f3e2b0", 300: "#e8cf86", 400: "#d4b25e", 500: "#b8913c" },
        candle: "#ffb45e",
      },
      fontFamily: {
        display: ['"Cinzel"', '"Shippori Mincho"', "serif"],
        serif: ['"Shippori Mincho"', '"Hiragino Mincho ProN"', '"Yu Mincho"', "serif"],
        sans: ['"Zen Kaku Gothic New"', '"Hiragino Sans"', '"Yu Gothic"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
