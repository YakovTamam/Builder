import Alert from "@/models/Alert";
import Material from "@/models/Material";
import Photo from "@/models/Photo";
import Project from "@/models/Project";
import Task from "@/models/Task";

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

    await Alert.create({
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

    await Alert.create({
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

  const openPhotoAlerts = await Alert.find({ type: "no_recent_photos", isRead: false, ...companyScope }).lean();
  for (const alert of openPhotoAlerts) {
    if (!alert.projectId) continue;
    const recentPhoto = await Photo.findOne({ projectId: alert.projectId, createdAt: { $gte: cutoff } }).lean();
    if (recentPhoto) {
      await Alert.updateOne({ _id: alert._id }, { isRead: true });
      resolved += 1;
    }
  }

  return { created, resolved };
}
