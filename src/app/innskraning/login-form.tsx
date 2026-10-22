"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <div className="mb-3 text-4xl" aria-hidden>📬</div>
        <h2 className="text-lg font-semibold">Athugaðu tölvupóstinn</h2>
        <p className="mt-2 text-stone-600">
          Við sendum innskráningarhlekk á <strong className="break-all">{state.email}</strong>. Opnaðu hann í
          þessu tæki til að halda áfram.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Netfang</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          placeholder="nafn@dæmi.is"
          className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />
      </label>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-orange-600 py-3 text-base font-semibold text-white active:bg-orange-700 disabled:opacity-60"
      >
        {pending ? "Sendi…" : "Senda innskráningarhlekk"}
      </button>
      <p className="text-center text-sm text-stone-500">Ekkert lykilorð. Nýir notendur eru skráðir sjálfkrafa.</p>
    </form>
  );
}
