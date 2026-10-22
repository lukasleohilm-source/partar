export default function Home() {
  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">
          Partar<span className="text-orange-600">.</span>
        </h1>
      </header>

      <form action="/leit" className="space-y-3">
        <input
          type="search"
          name="q"
          placeholder="Hvað vantar þig? t.d. framljós"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />
        <div className="relative">
          <input
            disabled
            aria-label="Leit eftir bílnúmeri (kemur bráðum)"
            placeholder="Leit eftir bílnúmeri"
            className="w-full rounded-xl border border-dashed border-stone-300 bg-stone-100 px-4 py-3 text-base text-stone-400"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-500">
            Kemur bráðum
          </span>
        </div>
        <button type="submit" className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white active:bg-orange-700">
          Leita
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-stone-500">Nýjustu auglýsingar birtast hér.</p>
    </div>
  );
}
