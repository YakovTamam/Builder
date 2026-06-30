import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import Company from "@/models/Company";
import User from "@/models/User";
import Project from "@/models/Project";
import CompanyForm from "./CompanyForm";

const ADMIN_ROLES = ["super_admin", "company_admin"];

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    redirect("/dashboard");
  }

  await connectToDatabase();

  const company = await Company.findById(session.companyId).lean();
  if (!company) {
    redirect("/dashboard");
  }

  const [usersCount, projectsCount] = await Promise.all([
    User.countDocuments({ companyId: session.companyId }),
    Project.countDocuments({ companyId: session.companyId }),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h1 className="text-2xl font-semibold">החברה שלי</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">משתמשים</p>
          <p className="text-2xl font-semibold">{usersCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">פרויקטים</p>
          <p className="text-2xl font-semibold">{projectsCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium mb-4">פרטי חברה</h2>
        <CompanyForm name={company.name} plan={company.plan ?? "trial"} />
      </div>
    </div>
  );
}
