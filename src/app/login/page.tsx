import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await connectToDatabase();
  const userCount = await User.countDocuments();

  if (userCount === 0) {
    redirect("/setup");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold mb-1">כניסה למערכת</h1>
        <p className="text-sm text-gray-500 mb-6">היכנס עם פרטי המשתמש שלך</p>
        <LoginForm />
      </div>
    </div>
  );
}
