import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenVault",
  description: "Self-hosted TOTP vault",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-[100svh] antialiased">
        {children}
      </body>
    </html>
  );
}
