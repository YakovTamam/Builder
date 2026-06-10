import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await connectToDatabase();
  const userCount = await User.countDocuments();

  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-semibold mb-1">הגדרת המערכת</h1>
        <p className="text-sm text-zinc-400 mb-6">
          זוהי ההפעלה הראשונה — צור את חשבון מנהל-העל ופרטי החברה שלך.
        </p>
        <SetupForm />
      </div>
    </div>
  );
}
