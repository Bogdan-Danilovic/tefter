/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/web/views/**/*.njk", "./public/app.js"],
  theme: {
    extend: {
      colors: {
        bg: "#f5f4f1",
        surface: "#ffffff",
        ink: "#1b1a18",
        muted: "#6f6b64",
        line: "#e7e3dc",
        "line-strong": "#d6d1c8",
        now: "#d1483a",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,26,24,0.05), 0 1px 3px rgba(27,26,24,0.06)",
        modal: "0 12px 48px rgba(27,26,24,0.20)",
        pop: "0 6px 24px rgba(27,26,24,0.12)",
      },
    },
  },
  plugins: [],
};
