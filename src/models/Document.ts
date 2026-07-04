import { Schema, model, models, type InferSchemaType } from "mongoose";

export const DOCUMENT_CATEGORIES = ["permit", "insurance", "certificate", "contract", "other"] as const;

const documentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    // Absent = company-wide (e.g. the contractor's own professional-liability
    // policy), not tied to a single project.
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    category: { type: String, enum: DOCUMENT_CATEGORIES, required: true },
    title: { type: String, required: true },
    // Issuing authority / insurer.
    issuer: { type: String },
    // Permit or policy number.
    policyNumber: { type: String },
    // Insurance coverage amount, when relevant.
    coverageAmount: { type: Number, min: 0 },
    // Scanned file, stored the same way as Photo.url (data URL).
    fileUrl: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    notes: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export type Document = InferSchemaType<typeof documentSchema>;

export default models.Document || model("Document", documentSchema);
