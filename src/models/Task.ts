import { Schema, model, models, type InferSchemaType } from "mongoose";

export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const TASK_TYPES = ["single", "sequence"] as const;

const taskSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    priority: { type: String, enum: TASK_PRIORITIES, default: "medium" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    dueDate: { type: Date },
    stage: { type: String },
    images: [{ type: String }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        text: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // type: "single" - independent task. "sequence" - generates a chain of follow-up tasks.
    type: { type: String, enum: TASK_TYPES, default: "single" },
    durationHours: { type: Number, min: 0 },
    // Links generated child tasks back to the sequence task that created them.
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task" },
    sequenceOrder: { type: Number },
    // Tasks that must be completed (status "done") before this one can start.
    dependsOn: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    checklist: [
      {
        text: { type: String, required: true },
        done: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

export type Task = InferSchemaType<typeof taskSchema>;

export default models.Task || model("Task", taskSchema);
