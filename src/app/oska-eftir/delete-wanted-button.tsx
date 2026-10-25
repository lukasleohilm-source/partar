"use client";

import { useTransition } from "react";
import { deleteWanted } from "./actions";

export function DeleteWantedButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Eyða óskinni ${title}? Tilkynningar sem tengjast henni hverfa líka.`)) return;
        startTransition(() => deleteWanted(id));
      }}
      className="text-red-600 disabled:opacity-50"
    >
      {pending ? "Eyði…" : "Eyða"}
    </button>
  );
}
