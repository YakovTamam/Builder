import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({
    settings: {
      logoUrl: settings.logoUrl,
      heroLogoWidth: settings.heroLogoWidth,
      heroLogoHeight: settings.heroLogoHeight,
      footerLogoWidth: settings.footerLogoWidth,
      footerLogoHeight: settings.footerLogoHeight,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await request.json();
  const { logoUrl, heroLogoWidth, heroLogoHeight, footerLogoWidth, footerLogoHeight } = body as {
    logoUrl?: string;
    heroLogoWidth?: number;
    heroLogoHeight?: number;
    footerLogoWidth?: number;
    footerLogoHeight?: number;
  };

  const sizes = { heroLogoWidth, heroLogoHeight, footerLogoWidth, footerLogoHeight };
  for (const [key, value] of Object.entries(sizes)) {
    if (value !== undefined && (typeof value !== "number" || value < 8 || value > 1024)) {
      return NextResponse.json({ error: `ערך לא תקין עבור ${key}` }, { status: 400 });
    }
  }

  const settings = await getSiteSettings();
  if (logoUrl !== undefined) settings.logoUrl = logoUrl;
  if (heroLogoWidth !== undefined) settings.heroLogoWidth = heroLogoWidth;
  if (heroLogoHeight !== undefined) settings.heroLogoHeight = heroLogoHeight;
  if (footerLogoWidth !== undefined) settings.footerLogoWidth = footerLogoWidth;
  if (footerLogoHeight !== undefined) settings.footerLogoHeight = footerLogoHeight;
  await settings.save();

  return NextResponse.json({
    settings: {
      logoUrl: settings.logoUrl,
      heroLogoWidth: settings.heroLogoWidth,
      heroLogoHeight: settings.heroLogoHeight,
      footerLogoWidth: settings.footerLogoWidth,
      footerLogoHeight: settings.footerLogoHeight,
    },
  });
}
