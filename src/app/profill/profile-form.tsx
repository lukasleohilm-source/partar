"use client";

import { Check, Loader2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { REGIONS } from "@/lib/i18n";
import { updateProfile, type ProfileState } from "./actions";
import { useT } from "@/components/lang-provider";
import { createClient } from "@/lib/supabase/client";

type Props = {
  displayName: string;
  region: string | null;
  phone: string | null;
  showPhone: boolean;
};

const input =
  "w-full rounded-xl border border-stone-300 bg-surface px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

export function ProfileForm({ displayName, region, phone, showPhone }: Props) {
  const { t } = useT();
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, { status: "idle" });
  const [name, setName] = useState(displayName);
  // null = óbreytt eða ekki athugað, "checking", "free" eða "taken"
  const [availability, setAvailability] = useState<null | "checking" | "free" | "taken">(null);

  // Athugar hvort nafnið sé laust á meðan skrifað er (bið 400 ms eftir síðasta staf)
  useEffect(() => {
    const value = name.trim();
    if (!value || value === displayName.trim()) return setAvailability(null);
    setAvailability("checking");
    const timer = setTimeout(async () => {
      const { data } = await createClient().rpc("display_name_available", { p_name: value });
      setAvailability(data ? "free" : "taken");
    }, 400);
    return () => clearTimeout(timer);
  }, [name, displayName]);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">{t("Nafn sem birtist")}</span>
        <div className="relative">
          <input
            name="display_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            aria-invalid={availability === "taken"}
            aria-describedby="nafn-stada"
            className={`${input} pr-11 ${availability === "taken" ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2" aria-hidden>
            {availability === "checking" && <Loader2 size={18} className="animate-spin text-stone-400" />}
            {availability === "free" && <Check size={18} className="text-green-600" />}
            {availability === "taken" && <X size={18} className="text-red-600" />}
          </span>
        </div>
        <span id="nafn-stada" role="status" className="mt-1 block min-h-5 text-sm">
          {availability === "free" && <span className="text-green-700">{t("Nafnið er laust")}</span>}
          {availability === "taken" && <span className="text-red-600">{t("Þetta nafn er þegar í notkun. Veldu annað.")}</span>}
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">{t("Landshluti")}</span>
        <select name="region" defaultValue={region ?? ""} className={input}>
          <option value="">{t("Veldu…")}</option>
          {Object.entries(REGIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">{t("Símanúmer (valfrjálst)")}</span>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={phone ?? ""} className={input} />
      </label>

      <label className="flex items-center gap-3">
        <input name="show_phone" type="checkbox" defaultChecked={showPhone} className="size-5 accent-orange-600" />
        <span className="text-stone-700">{t("Sýna símanúmer á auglýsingum mínum")}</span>
      </label>

      {state.status === "error" && <p role="alert" className="text-sm text-red-600">{t(state.message ?? "")}</p>}
      {state.status === "saved" && <p role="status" className="text-sm text-green-700">{t("Vistað ✓")}</p>}

      <button
        type="submit"
        disabled={pending || availability === "taken" || availability === "checking"}
        className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white active:bg-orange-700 disabled:opacity-60"
      >
        {pending ? t("Vista…") : t("Vista")}
      </button>
    </form>
  );
}
