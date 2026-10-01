import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CalmLine — De-escalation AI",
  description: "Real-time escalation prevention for customer support teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body
        className={`${playfair.variable} ${inter.variable} min-h-screen bg-[#F5EDE8] font-sans text-[#120D06] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
