"use client";

import { useTransition } from "react";
import { deleteWanted } from "./actions";
import { useT } from "@/components/lang-provider";

export function DeleteWantedButton({ id, title }: { id: string; title: string }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("Eyða óskinni {titill}? Tilkynningar sem tengjast henni hverfa líka.", { titill: title }))) return;
        startTransition(() => deleteWanted(id));
      }}
      className="text-red-600 disabled:opacity-50"
    >
      {pending ? t("Eyði…") : t("Eyða")}
    </button>
  );
}
