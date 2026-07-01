import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Builder - ניהול פרויקטי בנייה",
    short_name: "Builder",
    description: "מערכת ניהול פרויקטים חכמה לתחום הבנייה",
    start_url: "/dashboard",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#f8fafc",
    theme_color: "#f8fafc",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
