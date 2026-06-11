import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { MANAGE_ROLES } from "@/lib/access";
import TaskTemplate from "@/models/TaskTemplate";
import TemplatesManager from "./TemplatesManager";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session || !MANAGE_ROLES.includes(session.role)) {
    redirect("/dashboard");
  }

  await connectToDatabase();

  const templates = await TaskTemplate.find({ companyId: session.companyId }).sort({ createdAt: -1 }).lean();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">תבניות משימות</h1>
      <p className="text-sm text-zinc-400">
        תבנית מאפשרת ליצור בלחיצה אחת קבוצת משימות חוזרת לפרויקט (לדוגמה: שלב יסודות, שלב גמר).
      </p>

      <TemplatesManager
        templates={templates.map((t) => ({
          _id: String(t._id),
          name: t.name,
          items: (t.items ?? []).map((item: {
            title: string;
            description?: string;
            priority?: string;
            durationHours?: number;
            workersCount?: number;
            checklist?: string[];
          }) => ({
            title: item.title,
            description: item.description,
            priority: item.priority ?? "medium",
            durationHours: item.durationHours,
            workersCount: item.workersCount,
            checklist: item.checklist ?? [],
          })),
        }))}
      />
    </div>
  );
}
