"use client";

import type { ProjectLocations } from "@/lib/locations";

export type TaskLocationValue = { building: string; floor: string; unit: string };

export const EMPTY_LOCATION: TaskLocationValue = { building: "", floor: "", unit: "" };

const selectClass =
  "rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

// Three dependent-looking selects (building / floor / unit) sourced from the
// project's own location lists. Renders nothing if the project defined none.
export default function LocationFields({
  options,
  value,
  onChange,
}: {
  options: ProjectLocations;
  value: TaskLocationValue;
  onChange: (next: TaskLocationValue) => void;
}) {
  const hasAny =
    options.buildings.length > 0 || options.floors.length > 0 || options.units.length > 0;
  if (!hasAny) return null;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-700">מיקום</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.buildings.length > 0 && (
          <select
            value={value.building}
            onChange={(e) => onChange({ ...value, building: e.target.value })}
            className={selectClass}
            aria-label="בניין"
          >
            <option value="">בניין</option>
            {options.buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
        {options.floors.length > 0 && (
          <select
            value={value.floor}
            onChange={(e) => onChange({ ...value, floor: e.target.value })}
            className={selectClass}
            aria-label="קומה"
          >
            <option value="">קומה</option>
            {options.floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}
        {options.units.length > 0 && (
          <select
            value={value.unit}
            onChange={(e) => onChange({ ...value, unit: e.target.value })}
            className={selectClass}
            aria-label="דירה"
          >
            <option value="">דירה</option>
            {options.units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
