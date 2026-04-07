import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Holmes Project — Philadelphia Housing Intelligence",
  description: "Mapping Philadelphia's housing crisis block by block. Named for Thomas Holme, Surveyor General of Pennsylvania, 1683.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='%23471396' stroke='%23B13BFF' stroke-width='2'/><line x1='16' y1='2' x2='16' y2='30' stroke='%23FFCC00' stroke-width='1.5'/><line x1='2' y1='16' x2='30' y2='16' stroke='%23FFCC00' stroke-width='1.5'/></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
