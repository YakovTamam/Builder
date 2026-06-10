import { Schema, model, models, type InferSchemaType } from "mongoose";

export const ROLES = [
  "super_admin",
  "company_admin",
  "project_manager",
  "field_worker",
  "consultant",
  "client",
] as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: "field_worker" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    avatar: { type: String },
    phone: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;

export default models.User || model("User", userSchema);
