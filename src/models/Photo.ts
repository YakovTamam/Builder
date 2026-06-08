import { Schema, model, models, type InferSchemaType } from "mongoose";

const photoSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    tags: [{ type: String }],
    stage: { type: String },
    location: { type: String },
  },
  { timestamps: true },
);

export type Photo = InferSchemaType<typeof photoSchema>;

export default models.Photo || model("Photo", photoSchema);
