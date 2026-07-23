import Alert from "@/models/Alert";
import Document from "@/models/Document";
import Material from "@/models/Material";
import Photo from "@/models/Photo";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Equipment from "@/models/Equipment";
import { getExpiryStatus, daysUntilExpiry } from "@/lib/documents";
import { findEquipmentConflicts, type EquipmentBooking } from "@/lib/equipment";
import { createAndNotifyAlert } from "@/lib/notify";

const NO_RECENT_PHOTOS_DAYS = 7;

function heDate(d: Date) {
  return new Date(d).toLocaleDateString("he-IL");
}

/**
 * Scan for alert-worthy conditions and reconcile persisted Alert docs:
 * create new alerts (deduped by metadata) and auto-resolve ones no longer
 * relevant. Scoped to a single company when `companyId` is given (manual
 * refresh), or all companies when omitted (cron).
 */
export async function runAlertScan(opts?: { companyId?: string }): Promise<{ created: number; resolved: number }> {
  const now = new Date();
  let created = 0;
  let resolved = 0;

  const projectFilter = opts?.companyId ? { companyId: opts.companyId } : {};
  const projects = await Project.find(projectFilter).select("_id name companyId status").lean();
  const projMap = new Map(projects.map((p) => [String(p._id), p]));
  const projectIds = projects.map((p) => p._id);
  const companyScope = opts?.companyId ? { companyId: opts.companyId } : {};

  // --- Missing / late materials (optionally blocking a task) ---
  const blockingMaterials = await Material.find({
    projectId: { $in: projectIds },
    $or: [{ status: { $in: ["ordered", "in_transit"] }, expectedDate: { $lt: now } }, { status: "missing" }],
  }).lean();

  for (const material of blockingMaterials) {
    const existing = await Alert.findOne({
      type: "missing_material",
      "metadata.materialId": material._id,
      isRead: false,
    });
    if (existing) continue;

    const project = projMap.get(String(material.projectId));
    if (!project) continue;

    let taskTitle: string | undefined;
    if (material.taskId) {
      const t = await Task.findById(material.taskId).select("title").lean();
      taskTitle = t?.title;
    }

    const description = taskTitle
      ? `החומר "${material.name}" נדרש למשימה "${taskTitle}" וטרם הגיע — המשימה עלולה להיחסם.`
      : `החומר "${material.name}" בפרויקט "${project.name}" ${
          material.expectedDate ? `היה אמור להגיע ב-${heDate(material.expectedDate)} ` : ""
        }וטרם הגיע.`;

    await createAndNotifyAlert({
      companyId: project.companyId,
      projectId: project._id,
      type: "missing_material",
      severity: "high",
      title: `חומר חוסם: ${material.name}`,
      description,
      metadata: { materialId: material._id, taskId: material.taskId },
    });
    created += 1;
  }

  const openMaterialAlerts = await Alert.find({ type: "missing_material", isRead: false, ...companyScope }).lean();
  for (const alert of openMaterialAlerts) {
    const materialId = (alert.metadata as { materialId?: string } | undefined)?.materialId;
    if (!materialId) continue;
    const material = await Material.findById(materialId).lean();
    const stillBlocking =
      material &&
      material.status !== "arrived" &&
      (material.status === "missing" || (!!material.expectedDate && new Date(material.expectedDate) < now));
    if (!stillBlocking) {
      await Alert.updateOne({ _id: alert._id }, { isRead: true });
      resolved += 1;
    }
  }

  // --- Overdue tasks ---
  const overdueTasks = await Task.find({
    projectId: { $in: projectIds },
    status: { $ne: "done" },
    dueDate: { $lt: now },
  }).lean();

  for (const task of overdueTasks) {
    const existing = await Alert.findOne({ type: "task_overdue", "metadata.taskId": task._id, isRead: false });
    if (existing) continue;
    const project = projMap.get(String(task.projectId));
    if (!project) continue;

    await createAndNotifyAlert({
      companyId: project.companyId,
      projectId: project._id,
      type: "task_overdue",
      severity: "high",
      title: `משימה באיחור: ${task.title}`,
      description: `המשימה "${task.title}" בפרויקט "${project.name}" עברה את תאריך היעד (${heDate(task.dueDate!)}).`,
      metadata: { taskId: task._id },
    });
    created += 1;
  }

  const openTaskAlerts = await Alert.find({ type: "task_overdue", isRead: false, ...companyScope }).lean();
  for (const alert of openTaskAlerts) {
    const taskId = (alert.metadata as { taskId?: string } | undefined)?.taskId;
    if (!taskId) continue;
    const task = await Task.findById(taskId).lean();
    const stillOverdue = task && task.status !== "done" && !!task.dueDate && new Date(task.dueDate) < now;
    if (!stillOverdue) {
      await Alert.updateOne({ _id: alert._id }, { isRead: true });
      resolved += 1;
    }
  }

  // --- Active projects with no photos in the last N days ---
  const cutoff = new Date(now.getTime() - NO_RECENT_PHOTOS_DAYS * 24 * 60 * 60 * 1000);
  for (const project of projects) {
    if (!["active", "planning"].includes(project.status ?? "")) continue;
    const recentPhoto = await Photo.findOne({ projectId: project._id, createdAt: { $gte: cutoff } }).lean();
    if (recentPhoto) continue;

    const existing = await Alert.findOne({ type: "no_recent_photos", projectId: project._id, isRead: false });
    if (existing) continue;

    await createAndNotifyAlert({
      companyId: project.companyId,
      projectId: project._id,
      type: "no_recent_photos",
      severity: "medium",
      title: `אין תמונות עדכניות: ${project.name}`,
      description: `לא הועלו תמונות לפרויקט "${project.name}" ב-${NO_RECENT_PHOTOS_DAYS} הימים האחרונים.`,
    });
    created += 1;
  }

  const openPhotoAlerts = await Alert.find({ type: "no_recent_photos", isRead: false, ...companyScope }).lean();
  for (const alert of openPhotoAlerts) {
    if (!alert.projectId) continue;
    const recentPhoto = await Photo.findOne({ projectId: alert.projectId, createdAt: { $gte: cutoff } }).lean();
    if (recentPhoto) {
      await Alert.updateOne({ _id: alert._id }, { isRead: true });
      resolved += 1;
    }
  }

  // --- Expiring or expired documents (permits, insurance policies, ...) ---
  const documentFilter: Record<string, unknown> = { expiryDate: { $exists: true, $ne: null } };
  if (opts?.companyId) documentFilter.companyId = opts.companyId;
  const documents = await Document.find(documentFilter).lean();

  for (const doc of documents) {
    const status = getExpiryStatus(doc.expiryDate, now.getTime());
    if (status !== "expired" && status !== "expiring_soon") continue;

    const existing = await Alert.findOne({
      type: "document_expiring",
      "metadata.documentId": doc._id,
      isRead: false,
    });
    if (existing) continue;

    const project = doc.projectId ? projMap.get(String(doc.projectId)) : undefined;
    const scopeLabel = project ? `בפרויקט "${project.name}"` : "ברמת החברה";
    const detail =
      status === "expired"
        ? `פג תוקף ב-${heDate(doc.expiryDate!)}`
        : `יפוג תוקף בעוד ${daysUntilExpiry(doc.expiryDate!, now.getTime())} ימים (${heDate(doc.expiryDate!)})`;

    await createAndNotifyAlert({
      companyId: doc.companyId,
      projectId: doc.projectId ?? undefined,
      type: "document_expiring",
      severity: status === "expired" ? "high" : "medium",
      title: `${status === "expired" ? "פג תוקף" : "עומד לפוג תוקף"}: ${doc.title}`,
      description: `המסמך "${doc.title}" ${scopeLabel} ${detail}.`,
      metadata: { documentId: doc._id },
    });
    created += 1;
  }

  const openDocumentAlerts = await Alert.find({ type: "document_expiring", isRead: false, ...companyScope }).lean();
  for (const alert of openDocumentAlerts) {
    const documentId = (alert.metadata as { documentId?: string } | undefined)?.documentId;
    if (!documentId) continue;
    const doc = await Document.findById(documentId).lean();
    const status = getExpiryStatus(doc?.expiryDate, now.getTime());
    if (status !== "expired" && status !== "expiring_soon") {
      await Alert.updateOne({ _id: alert._id }, { isRead: true });
      resolved += 1;
    }
  }

  // --- Double-booked equipment (same machine, two sites, overlapping dates) ---
  const equipmentDocs = await Equipment.find({ projectId: { $in: projectIds } })
    .select("name projectId startDate endDate companyId")
    .lean();

  // Group bookings per company so machines are never matched across tenants.
  const bookingsByCompany = new Map<string, EquipmentBooking[]>();
  for (const e of equipmentDocs) {
    const companyId = String(e.companyId);
    const list = bookingsByCompany.get(companyId) ?? [];
    list.push({
      id: String(e._id),
      name: e.name,
      projectId: String(e.projectId),
      startDate: e.startDate,
      endDate: e.endDate,
    });
    bookingsByCompany.set(companyId, list);
  }

  const activeConflictKeys = new Set<string>();
  for (const [companyId, bookings] of bookingsByCompany) {
    for (const conflict of findEquipmentConflicts(bookings)) {
      const nameKey = conflict.name.toLowerCase();
      activeConflictKeys.add(`${companyId}::${nameKey}`);

      const existing = await Alert.findOne({
        type: "equipment_conflict",
        companyId,
        "metadata.nameKey": nameKey,
        isRead: false,
      });
      if (existing) continue;

      const siteNames = conflict.projectIds
        .map((pid) => projMap.get(pid)?.name)
        .filter(Boolean)
        .join(", ");

      await createAndNotifyAlert({
        companyId,
        type: "equipment_conflict",
        severity: "high",
        title: `התנגשות ציוד: ${conflict.name}`,
        description: `המכונה "${conflict.name}" מוזמנת במקביל למספר אתרים (${siteNames}). יש לתאם מחדש.`,
        metadata: { nameKey, name: conflict.name, projectIds: conflict.projectIds, equipmentIds: conflict.ids },
      });
      created += 1;
    }
  }

  const openEquipmentAlerts = await Alert.find({ type: "equipment_conflict", isRead: false, ...companyScope }).lean();
  for (const alert of openEquipmentAlerts) {
    const nameKey = (alert.metadata as { nameKey?: string } | undefined)?.nameKey ?? "";
    if (!activeConflictKeys.has(`${String(alert.companyId)}::${nameKey}`)) {
      await Alert.updateOne({ _id: alert._id }, { isRead: true });
      resolved += 1;
    }
  }

  return { created, resolved };
}
