import { AlertTriangle, Ban, Bell, Bug, Eye, EyeOff, Flag, MessageCircle, Package, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatNumber } from "@/lib/i18n";
import { timeAgo } from "@/lib/listings";
import { REPORT_REASONS, type ReportReason } from "@/lib/moderation";
import { createClient } from "@/lib/supabase/server";
import { dismissReports, hideListing, restoreListing, setBan } from "./actions";

export const metadata = { title: "Stjórnborð – Partar", robots: { index: false } };

type Stats = {
  listings_active: number;
  listings_today: number;
  users_total: number;
  users_today: number;
  messages_today: number;
  reports_open: number;
  errors_today: number;
  push_subscribers: number;
};

type Report = {
  listing_id: string;
  title: string;
  status: "active" | "sold" | "removed" | "draft";
  seller_id: string;
  seller_name: string;
  seller_banned: boolean;
  report_count: number;
  reasons: ReportReason[];
  details: string[];
  last_report: string;
};

type ClientError = { id: number; created_at: string; url: string | null; message: string; stack: string | null; user_agent: string | null };

const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const [statsRes, reportsRes, errorsRes] = await Promise.all([
    supabase.rpc("admin_stats").single<Stats>(),
    supabase.rpc("admin_reports"),
    supabase.rpc("admin_errors", { p_limit: 30 }),
  ]);
  const stats = statsRes.data;
  const reports = (reportsRes.data ?? []) as Report[];
  const errors = (errorsRes.data ?? []) as ClientError[];

  const tiles: { icon: LucideIcon; label: string; value: number; sub?: string; warn?: boolean }[] = stats
    ? [
        { icon: Package, label: "Virkar auglýsingar", value: stats.listings_active, sub: `+${stats.listings_today} í dag` },
        { icon: Users, label: "Notendur", value: stats.users_total, sub: `+${stats.users_today} í dag` },
        { icon: MessageCircle, label: "Skilaboð í dag", value: stats.messages_today },
        { icon: Bell, label: "Með tilkynningar", value: stats.push_subscribers },
        { icon: Flag, label: "Tilkynntar", value: stats.reports_open, warn: stats.reports_open > 0 },
        { icon: Bug, label: "Villur í dag", value: stats.errors_today, warn: stats.errors_today > 0 },
      ]
    : [];

  return (
    <div className="mx-auto max-w-md md:max-w-2xl md:pt-10 space-y-6 px-4 pt-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Stjórnborð</h1>
        <p className="text-sm text-stone-500">Aðeins sýnilegt stjórnendum.</p>
      </header>

      <section className="grid grid-cols-2 gap-2">
        {tiles.map(({ icon: Icon, label, value, sub, warn }) => (
          <div key={label} className={`rounded-2xl p-3 shadow-sm ring-1 ${warn ? "bg-orange-50 ring-orange-200" : "bg-surface ring-black/5"}`}>
            <Icon size={18} className={warn ? "text-orange-600" : "text-stone-400"} />
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
            <p className="text-xs font-medium text-stone-500">
              {label}
              {sub && <span className="block text-stone-400">{sub}</span>}
            </p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold tracking-tight">Tilkynntar auglýsingar</h2>
        {!reports.length ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-stone-500">Engar tilkynningar. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.listing_id} className={`rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5 ${r.status === "removed" ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/auglysing/${r.listing_id}`} className="font-semibold underline-offset-2 hover:underline">
                      {r.title}
                    </Link>
                    <p className="text-sm text-stone-500">
                      {r.seller_name}
                      {r.seller_banned && <span className="ml-1 font-semibold text-red-600">(bannaður)</span>} · {timeAgo(r.last_report)}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-sm font-bold text-red-700">
                    <Flag size={13} /> {r.report_count}
                  </span>
                </div>
                <p className="mt-2 flex flex-wrap gap-1">
                  {r.reasons.map((reason) => (
                    <span key={reason} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">
                      {REPORT_REASONS[reason]}
                    </span>
                  ))}
                </p>
                {r.details.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-stone-600">
                    {r.details.slice(0, 3).map((d, i) => (
                      <li key={i}>„{d}“</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "removed" ? (
                    <form action={restoreListing.bind(null, r.listing_id)}>
                      <button type="submit" className={`${btn} bg-green-50 text-green-800`}>
                        <Eye size={15} /> Birta aftur
                      </button>
                    </form>
                  ) : (
                    <form action={hideListing.bind(null, r.listing_id)}>
                      <button type="submit" className={`${btn} bg-red-600 text-white`}>
                        <EyeOff size={15} /> Fela
                      </button>
                    </form>
                  )}
                  <form action={dismissReports.bind(null, r.listing_id, r.status === "removed" ? "active" : r.status)}>
                    <button type="submit" className={`${btn} bg-stone-100 text-stone-700`}>
                      Hafna tilkynningum
                    </button>
                  </form>
                  <form action={setBan.bind(null, r.seller_id, !r.seller_banned)}>
                    <button type="submit" className={`${btn} ${r.seller_banned ? "bg-stone-100 text-stone-700" : "bg-stone-900 text-white"}`}>
                      <Ban size={15} /> {r.seller_banned ? "Afbanna" : "Banna seljanda"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold tracking-tight">Nýjustu villur</h2>
        {!errors.length ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-stone-500">Engar villur skráðar.</p>
        ) : (
          <ul className="space-y-2">
            {errors.map((e) => (
              <li key={e.id} className="rounded-2xl bg-surface p-3 text-sm shadow-sm ring-1 ring-black/5">
                <p className="flex items-start gap-2 font-medium">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-600" />
                  <span className="break-words">{e.message}</span>
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {e.url} · {timeAgo(e.created_at)}
                </p>
                {e.stack && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-stone-500">Stafli</summary>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-100 p-2 text-[11px]">{e.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
