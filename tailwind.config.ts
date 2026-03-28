import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      /* Design tokens: spacing, radii, typography */
      spacing: {
        "section": "24px",
        "section-lg": "32px",
        "card": "20px",
        "card-lg": "24px",
      },
      borderRadius: {
        "card": "1rem",
        "input": "0.75rem",
      },
      boxShadow: {
        "card": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "btn-primary": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "btn-primary-hover": "0 2px 4px -1px rgb(0 0 0 / 0.1)",
      },
      transitionDuration: {
        "200": "200ms",
      },
      transitionTimingFunction: {
        "out": "cubic-bezier(0, 0, 0.2, 1)",
      },
      colors: {
        cl: {
          "bg-0": "var(--cl-bg-0)",
          "bg-1": "var(--cl-bg-1)",
          card: "var(--cl-card)",
          "card-2": "var(--cl-card-2)",
          border: "var(--cl-border)",
          text: "var(--cl-text)",
          muted: "var(--cl-muted)",
          primary: "var(--cl-primary)",
          accent: "var(--cl-accent)",
          warn: "var(--cl-warn)",
          danger: "var(--cl-danger)",
          success: "var(--cl-success)",
        },
        brand: {
          primary: "var(--cl-espresso)",
          accent: "var(--cl-sand)",
        },
        espresso: "#292524",
        sand: "#faf7f2",
        base: "#F6F4EF",
        "sidebar-bg": "#F5F2EE",
        "nav-bg": "#EFEBE5",
        "header-bg": "#FAFAF9",
        accent: "#EAE3D6",
        "accent-deep": "#D4CBB8",
        charcoal: "#2B2B2B",
        heading: "#1F1F1F",
        subtitle: "#333333",
        muted: "#5C5C5C",
        ink: "#111111",
        risk: {
          low: "#15803d",
          medium: "#475569",
          high: "#b91c1c",
        },
        "badge-low": "#D1E7DD",
        "badge-medium": "#E2E8F0",
        "badge-high": "#F8D7DA",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "body": ["15px", { lineHeight: "1.5rem" }],
        "display": ["2.75rem", { lineHeight: "1.15" }],
        "display-sm": ["3.5rem", { lineHeight: "1.1" }],
      },
    },
  },
  plugins: [],
};
export default config;
