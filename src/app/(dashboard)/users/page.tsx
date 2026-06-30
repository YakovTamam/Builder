import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import NewUserForm from "./NewUserForm";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל-על",
  company_admin: "מנהל חברה",
  project_manager: "מנהל פרויקט",
  field_worker: "עובד שטח",
  consultant: "יועץ",
  client: "לקוח",
};

export default async function UsersPage() {
  const session = await getSession();
  if (!session || !["super_admin", "company_admin"].includes(session.role)) {
    redirect("/dashboard");
  }

  await connectToDatabase();
  const users = await User.find({ companyId: session.companyId })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">משתמשים</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium mb-4">הוספת משתמש חדש</h2>
        <NewUserForm />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="text-start p-3 font-medium">שם</th>
              <th className="text-start p-3 font-medium">אימייל</th>
              <th className="text-start p-3 font-medium">תפקיד</th>
              <th className="text-start p-3 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={String(user._id)} className="border-b border-gray-200 last:border-0">
                <td className="p-3">{user.name}</td>
                <td className="p-3 text-gray-500">{user.email}</td>
                <td className="p-3">{ROLE_LABELS[user.role] ?? user.role}</td>
                <td className="p-3">
                  <span
                    className={
                      user.status === "active"
                        ? "rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs"
                        : "rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-xs"
                    }
                  >
                    {user.status === "active" ? "פעיל" : "לא פעיל"}
                  </span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-gray-500 text-center">
                  אין משתמשים נוספים עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
