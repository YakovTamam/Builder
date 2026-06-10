import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    redirect("/dashboard");
  }

  const settings = await getSiteSettings();

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">הגדרות מיתוג</h1>
      <SettingsForm
        initial={{
          logoUrl: settings.logoUrl ?? "/icon.svg",
          heroLogoWidth: settings.heroLogoWidth ?? 96,
          heroLogoHeight: settings.heroLogoHeight ?? 96,
          footerLogoWidth: settings.footerLogoWidth ?? 32,
          footerLogoHeight: settings.footerLogoHeight ?? 32,
        }}
      />
    </div>
  );
}
