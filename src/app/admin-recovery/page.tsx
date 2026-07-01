import RecoveryForm from "./RecoveryForm";

export const dynamic = "force-dynamic";

export default function AdminRecoveryPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold mb-1">שחזור גישת מנהל-על</h1>
        <p className="text-sm text-gray-500 mb-6">
          השתמש בקוד השחזור כדי ליצור משתמש מנהל-על חדש או לשחזר משתמש קיים.
        </p>
        <RecoveryForm />
      </div>
    </div>
  );
}
