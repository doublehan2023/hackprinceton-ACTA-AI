import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACTA AI — Clinical Trial Contract Intelligence",
  description: "AI-powered ACTA compliance analysis, automated redlines, and legal risk scoring for Clinical Trial Agreements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}