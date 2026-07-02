import { Schema, model, models, type InferSchemaType } from "mongoose";

export const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed"] as const;

const projectSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    address: { type: String },
    status: { type: String, enum: PROJECT_STATUSES, default: "planning" },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    budget: { type: Number },
    startDate: { type: Date },
    dueDate: { type: Date },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    coverImage: { type: String },
    // Location taxonomy for the project; tasks pick from these lists.
    locations: {
      buildings: [{ type: String }],
      floors: [{ type: String }],
      units: [{ type: String }],
    },
  },
  { timestamps: true },
);

export type Project = InferSchemaType<typeof projectSchema>;

export default models.Project || model("Project", projectSchema);
