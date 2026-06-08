import { Schema, model, models, type InferSchemaType } from "mongoose";

const activityLogSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export type ActivityLog = InferSchemaType<typeof activityLogSchema>;

export default models.ActivityLog || model("ActivityLog", activityLogSchema);
