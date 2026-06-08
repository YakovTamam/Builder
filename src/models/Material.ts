import { Schema, model, models, type InferSchemaType } from "mongoose";

export const MATERIAL_STATUSES = ["ordered", "in_transit", "arrived", "missing", "issue"] as const;

const materialSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String },
    supplier: { type: String },
    status: { type: String, enum: MATERIAL_STATUSES, default: "ordered" },
    expectedDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);

export type Material = InferSchemaType<typeof materialSchema>;

export default models.Material || model("Material", materialSchema);
