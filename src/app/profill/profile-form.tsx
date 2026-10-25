"use client";

import { useActionState } from "react";
import { REGIONS } from "@/lib/i18n";
import { updateProfile, type ProfileState } from "./actions";
import { useT } from "@/components/lang-provider";

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

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">{t("Nafn sem birtist")}</span>
        <input name="display_name" defaultValue={displayName} required maxLength={60} className={input} />
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
        disabled={pending}
        className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white active:bg-orange-700 disabled:opacity-60"
      >
        {pending ? t("Vista…") : t("Vista")}
      </button>
    </form>
  );
}
