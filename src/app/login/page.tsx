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
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-semibold mb-1">כניסה למערכת</h1>
        <p className="text-sm text-zinc-400 mb-6">היכנס עם פרטי המשתמש שלך</p>
        <LoginForm />
      </div>
    </div>
  );
}
