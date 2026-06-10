import { Schema, model, models, type InferSchemaType } from "mongoose";

const settingsSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },
    logoUrl: { type: String, default: "/icon.svg" },
    heroLogoWidth: { type: Number, default: 96 },
    heroLogoHeight: { type: Number, default: 96 },
    footerLogoWidth: { type: Number, default: 32 },
    footerLogoHeight: { type: Number, default: 32 },
  },
  { timestamps: true },
);

export type Settings = InferSchemaType<typeof settingsSchema>;

export default models.Settings || model("Settings", settingsSchema);
