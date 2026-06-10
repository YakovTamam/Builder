import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Builder - ניהול פרויקטי בנייה",
  description: "מערכת SaaS לניהול פרויקטים בתחום הבנייה",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Builder",
  },
  icons: {
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
