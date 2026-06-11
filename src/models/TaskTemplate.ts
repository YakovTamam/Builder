import { Schema, model, models, type InferSchemaType } from "mongoose";
import { TASK_PRIORITIES } from "@/models/Task";

const taskTemplateSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    items: [
      {
        title: { type: String, required: true },
        description: { type: String },
        priority: { type: String, enum: TASK_PRIORITIES, default: "medium" },
        durationHours: { type: Number, min: 0 },
        workersCount: { type: Number, min: 0 },
        checklist: [{ type: String }],
      },
    ],
  },
  { timestamps: true },
);

export type TaskTemplate = InferSchemaType<typeof taskTemplateSchema>;

export default models.TaskTemplate || model("TaskTemplate", taskTemplateSchema);
