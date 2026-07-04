import { Schema, model, models, type InferSchemaType } from "mongoose";

export const ALERT_TYPES = [
  "task_overdue",
  "missing_material",
  "no_recent_photos",
  "stage_stalled",
  "document_expiring",
] as const;
export const ALERT_SEVERITIES = ["low", "medium", "high"] as const;

const alertSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, default: "medium" },
    title: { type: String, required: true },
    description: { type: String },
    isRead: { type: Boolean, default: false },
    // Free-form context used for de-duplication and auto-resolution,
    // e.g. { materialId } or { taskId }.
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export type Alert = InferSchemaType<typeof alertSchema>;

export default models.Alert || model("Alert", alertSchema);
