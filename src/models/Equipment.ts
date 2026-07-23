import { Schema, model, models, type InferSchemaType } from "mongoose";

export const EQUIPMENT_STATUSES = ["scheduled", "on_site", "returned", "maintenance"] as const;
export const EQUIPMENT_OWNERSHIP = ["owned", "rented"] as const;

// A machine/tool allocated to a project for a date range. The same physical
// machine (matched by name within a company) can be scheduled to several
// projects over time — overlapping ranges across different projects are a
// double-booking conflict (see src/lib/equipment.ts).
const equipmentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true },
    category: { type: String },
    ownership: { type: String, enum: EQUIPMENT_OWNERSHIP, default: "owned" },
    supplier: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: EQUIPMENT_STATUSES, default: "scheduled" },
    // Optional link to the task this machine is needed for.
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    notes: { type: String },
  },
  { timestamps: true },
);

export type Equipment = InferSchemaType<typeof equipmentSchema>;

export default models.Equipment || model("Equipment", equipmentSchema);
