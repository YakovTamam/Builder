import { Schema, model, models, type InferSchemaType } from "mongoose";

const companySchema = new Schema(
  {
    name: { type: String, required: true },
    logo: { type: String },
    plan: { type: String, default: "trial" },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export type Company = InferSchemaType<typeof companySchema>;

export default models.Company || model("Company", companySchema);
