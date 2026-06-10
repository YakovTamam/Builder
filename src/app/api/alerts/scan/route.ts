import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Alert from "@/models/Alert";
import Material from "@/models/Material";
import Photo from "@/models/Photo";
import Project, { PROJECT_STATUSES } from "@/models/Project";

const NO_RECENT_PHOTOS_DAYS = 7;

export async function POST(request: Request) {
  const secret = process.env.ALERTS_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ALERTS_CRON_SECRET לא מוגדר" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  await connectToDatabase();

  const now = new Date();
  let created = 0;
  let resolved = 0;

  // --- Missing materials: ordered/in-transit items past their expected date ---
  const overdueMaterials = await Material.find({
    status: { $in: ["ordered", "in_transit"] },
    expectedDate: { $lt: now },
  }).lean();

  for (const material of overdueMaterials) {
    const existing = await Alert.findOne({
      type: "missing_material",
      "metadata.materialId": material._id,
      isRead: false,
    });
    if (existing) continue;

    const project = await Project.findById(material.projectId).lean();
    if (!project) continue;

    await Alert.create({
      companyId: project.companyId,
      projectId: project._id,
      type: "missing_material",
      severity: "high",
      title: `חומר באיחור: ${material.name}`,
      description: `החומר "${material.name}" לפרויקט "${project.name}" היה אמור להגיע ב-${new Date(material.expectedDate!).toLocaleDateString("he-IL")} וטרם הגיע.`,
      metadata: { materialId: material._id },
    });
    created += 1;
  }

  // Auto-resolve missing_material alerts whose material has since arrived.
  const openMaterialAlerts = await Alert.find({ type: "missing_material", isRead: false }).lean();
  for (const alert of openMaterialAlerts) {
    const materialId = (alert.metadata as { materialId?: string } | undefined)?.materialId;
    if (!materialId) continue;
    const material = await Material.findById(materialId).lean();
    if (!material || material.status === "arrived") {
      await Alert.updateOne({ _id: alert._id }, { isRead: true });
      resolved += 1;
    }
  }

  // --- Active projects with no photos in the last N days ---
  const cutoff = new Date(now.getTime() - NO_RECENT_PHOTOS_DAYS * 24 * 60 * 60 * 1000);
  const activeProjects = await Project.find({ status: { $in: ["active", "planning"] satisfies (typeof PROJECT_STATUSES)[number][] } }).lean();

  for (const project of activeProjects) {
    const recentPhoto = await Photo.findOne({ projectId: project._id, createdAt: { $gte: cutoff } }).lean();
    if (recentPhoto) continue;

    const existing = await Alert.findOne({
      type: "no_recent_photos",
      projectId: project._id,
      isRead: false,
    });
    if (existing) continue;

    await Alert.create({
      companyId: project.companyId,
      projectId: project._id,
      type: "no_recent_photos",
      severity: "medium",
      title: `אין תמונות עדכניות: ${project.name}`,
      description: `לא הועלו תמונות לפרויקט "${project.name}" ב-${NO_RECENT_PHOTOS_DAYS} הימים האחרונים.`,
    });
    created += 1;
  }

  // Auto-resolve no_recent_photos alerts once a recent photo exists.
  const openPhotoAlerts = await Alert.find({ type: "no_recent_photos", isRead: false }).lean();
  for (const alert of openPhotoAlerts) {
    if (!alert.projectId) continue;
    const recentPhoto = await Photo.findOne({ projectId: alert.projectId, createdAt: { $gte: cutoff } }).lean();
    if (recentPhoto) {
      await Alert.updateOne({ _id: alert._id }, { isRead: true });
      resolved += 1;
    }
  }

  return NextResponse.json({ ok: true, created, resolved });
}
