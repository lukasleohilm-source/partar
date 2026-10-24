import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

// Byggingareiningar Ég-flipans: flokkaðar raðir eins og í stillingum símans

export function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      {title && <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</h2>}
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">{children}</div>
    </section>
  );
}

const TONES = {
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-600",
  blue: "bg-sky-100 text-sky-700",
  green: "bg-emerald-100 text-emerald-700",
  violet: "bg-violet-100 text-violet-700",
  stone: "bg-stone-100 text-stone-600",
  dark: "bg-stone-900 text-white",
};

type RowProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  value?: string | number;
  tone?: keyof typeof TONES;
  danger?: boolean;
};

function RowInner({ icon: Icon, label, hint, value, tone = "stone", danger }: RowProps) {
  return (
    <>
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${danger ? TONES.red : TONES[tone]}`}>
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${danger ? "text-red-600" : "text-stone-900"}`}>{label}</span>
        {hint && <span className="block truncate text-sm text-stone-500">{hint}</span>}
      </span>
      {value !== undefined && value !== 0 && <span className="text-sm font-medium tabular-nums text-stone-500">{value}</span>}
    </>
  );
}

const rowClass = "flex w-full items-center gap-3 px-4 py-3 text-left active:bg-stone-100";

export function Row({ href, ...props }: RowProps & { href: string }) {
  return (
    <Link href={href} className={rowClass}>
      <RowInner {...props} />
      <ChevronRight size={18} className="shrink-0 text-stone-400" aria-hidden />
    </Link>
  );
}

// Röð sem sendir form (t.d. „Skrá út“)
export function ActionRow({ action, ...props }: RowProps & { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button type="submit" className={rowClass}>
        <RowInner {...props} />
      </button>
    </form>
  );
}

export function SubpageHeader({ title, back = "/profill" }: { title: string; back?: string }) {
  return (
    <header className="mb-5 flex items-center gap-1">
      <Link href={back} aria-label="Til baka" className="-ml-2 grid size-10 place-items-center rounded-full text-stone-600 active:bg-stone-100">
        <ChevronLeft size={26} />
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </header>
  );
}
