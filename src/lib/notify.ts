import Alert from "@/models/Alert";
import Project from "@/models/Project";
import Task from "@/models/Task";
import User from "@/models/User";
import { escapeHtml, sendTelegramMessage, telegramConfigured } from "@/lib/telegram";

type AlertDoc = {
  _id: unknown;
  companyId: unknown;
  projectId?: unknown;
  type: string;
  severity?: string;
  title: string;
  description?: string;
  metadata?: unknown;
};

const SEVERITY_EMOJI: Record<string, string> = { high: "🔴", medium: "🟠", low: "🟡" };

function formatAlertMessage(alert: AlertDoc): string {
  const emoji = SEVERITY_EMOJI[alert.severity ?? "medium"] ?? "🔔";
  const lines = [`${emoji} <b>${escapeHtml(alert.title)}</b>`];
  if (alert.description) lines.push(escapeHtml(alert.description));
  return lines.join("\n");
}

// Work out which users should hear about an alert:
// - every company admin / super-admin of the alert's company
// - the manager of the alert's project (if any)
// - for an overdue task, the worker it is assigned to
async function alertRecipientUserIds(alert: AlertDoc): Promise<string[]> {
  const ids = new Set<string>();

  const admins = await User.find({
    companyId: alert.companyId,
    role: { $in: ["company_admin", "super_admin"] },
  })
    .select("_id")
    .lean();
  for (const admin of admins) ids.add(String(admin._id));

  if (alert.projectId) {
    const project = await Project.findById(alert.projectId).select("managerId").lean();
    if (project?.managerId) ids.add(String(project.managerId));
  }

  if (alert.type === "task_overdue") {
    const taskId = (alert.metadata as { taskId?: unknown } | undefined)?.taskId;
    if (taskId) {
      const task = await Task.findById(taskId).select("assignedTo").lean();
      if (task?.assignedTo) ids.add(String(task.assignedTo));
    }
  }

  return [...ids];
}

// Fire Telegram notifications for a freshly-created alert. Best-effort: never
// throws, and does nothing when Telegram isn't configured.
export async function dispatchAlertNotifications(alert: AlertDoc): Promise<void> {
  if (!telegramConfigured()) return;

  const userIds = await alertRecipientUserIds(alert);
  if (userIds.length === 0) return;

  const recipients = await User.find({
    _id: { $in: userIds },
    status: "active",
    telegramChatId: { $exists: true, $ne: null },
  })
    .select("telegramChatId")
    .lean();
  if (recipients.length === 0) return;

  const text = formatAlertMessage(alert);
  await Promise.allSettled(
    recipients.map((u) => sendTelegramMessage(String(u.telegramChatId), text)),
  );
}

// Create an Alert and notify its recipients. Notification failures are
// swallowed so they never prevent the alert from being recorded.
export async function createAndNotifyAlert(
  data: Record<string, unknown>,
): Promise<Awaited<ReturnType<typeof Alert.create>>> {
  const alert = await Alert.create(data);
  try {
    await dispatchAlertNotifications(alert as unknown as AlertDoc);
  } catch {
    // Ignore — notifications are best-effort.
  }
  return alert;
}
