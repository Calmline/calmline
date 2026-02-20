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
          medium: "#a16207",
          high: "#b91c1c",
        },
        "badge-low": "#D1E7DD",
        "badge-medium": "#FFF3CD",
        "badge-high": "#F8D7DA",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display": ["2.75rem", { lineHeight: "1.15" }],
        "display-sm": ["3.5rem", { lineHeight: "1.1" }],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(43, 43, 43, 0.06)",
        "soft-md": "0 2px 6px rgba(43, 43, 43, 0.08)",
        "soft-lg": "0 4px 12px rgba(43, 43, 43, 0.06)",
        card: "0 1px 3px rgba(43, 43, 43, 0.08)",
        "card-elevated": "0 2px 8px rgba(43, 43, 43, 0.06)",
        "hover-lift": "0 4px 14px rgba(43, 43, 43, 0.12)",
        input: "0 1px 2px rgba(43, 43, 43, 0.05)",
      },
      transitionDuration: {
        200: "200ms",
      },
      transitionTimingFunction: {
        ease: "ease",
      },
    },
  },
  plugins: [],
};
export default config;
