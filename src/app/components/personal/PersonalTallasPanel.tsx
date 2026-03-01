"use client";

type TallaEntry = {
  key: string;
  label: string;
  value: string;
};

type PersonalTallasPanelProps = {
  entries: TallaEntry[];
  desktop?: boolean;
};

export function PersonalTallasPanel({ entries, desktop = false }: PersonalTallasPanelProps) {
  return (
    <div className={desktop ? "grid grid-cols-2 gap-2 lg:grid-cols-5" : "grid grid-cols-2 gap-2"}>
      {entries.map((entry) => (
        <div key={entry.key} className={`rounded-md border border-stone-200 ${desktop ? "bg-white" : "bg-stone-50"} px-2 py-2`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{entry.label}</p>
          <p className="mt-1 text-sm font-bold text-stone-900">{entry.value}</p>
        </div>
      ))}
    </div>
  );
}
