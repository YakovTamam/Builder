import { Schema, model, models, type InferSchemaType } from "mongoose";

export const COLLABORATOR_PERMISSIONS = ["view", "comment", "edit"] as const;

const taskCollaboratorSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    permission: { type: String, enum: COLLABORATOR_PERMISSIONS, default: "view" },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

taskCollaboratorSchema.index({ taskId: 1, userId: 1 }, { unique: true });

export type TaskCollaborator = InferSchemaType<typeof taskCollaboratorSchema>;

export default models.TaskCollaborator || model("TaskCollaborator", taskCollaboratorSchema);
