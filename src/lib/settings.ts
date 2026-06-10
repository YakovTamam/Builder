import { connectToDatabase } from "@/lib/db";
import SettingsModel from "@/models/Settings";

export async function getSiteSettings() {
  await connectToDatabase();
  let settings = await SettingsModel.findOne({ key: "global" });
  if (!settings) {
    settings = await SettingsModel.create({ key: "global" });
  }
  return settings;
}
