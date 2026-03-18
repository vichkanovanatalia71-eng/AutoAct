const { tailwindTheme } = require("@autoact/ui-tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: tailwindTheme.colors,
    },
  },
  plugins: [],
};
