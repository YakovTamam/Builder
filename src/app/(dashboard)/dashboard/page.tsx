const KPI_CARDS = [
  { label: "פרויקטים פעילים", value: "—" },
  { label: "משימות פתוחות", value: "—" },
  { label: "משימות באיחור", value: "—" },
  { label: "התראות חדשות", value: "—" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">דף הבית</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2"
          >
            <span className="text-sm text-gray-500">{card.label}</span>
            <span className="text-3xl font-bold">{card.value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-medium mb-2">התראות אחרונות</h2>
        <p className="text-gray-500 text-sm">אין התראות להצגה כרגע.</p>
      </div>
    </div>
  );
}
