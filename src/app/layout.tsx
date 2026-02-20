import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DashboardLayout } from "@/components/DashboardLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calmline — De-escalation AI",
  description: "Real-time escalation prevention for customer support teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-heading antialiased">
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
