import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Builder - ניהול פרויקטי בנייה",
  description: "מערכת SaaS לניהול פרויקטים בתחום הבנייה",
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
      </body>
    </html>
  );
}
