/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          DEFAULT: "#1f2937",
          accent: "#b08d57", // tom "areia/bronze" — alto padrão
        },
      },
    },
  },
  plugins: [],
};
