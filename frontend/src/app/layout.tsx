import "./globals.css";

export const metadata = {
  title: "ACTA",
  description: "CTA Contract Review Assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
