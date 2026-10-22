export type Make = { id: number; name: string };
export type Model = { id: number; make_id: number; name: string };
export type Category = { id: number; parent_id: number | null; name: string; sort: number };

export type Fitment = {
  make_id: number;
  model_id: number | null; // null = allar gerðir
  year_from: number | null;
  year_to: number | null;
};

const THIS_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: THIS_YEAR + 1 - 1970 + 1 }, (_, i) => THIS_YEAR + 1 - i);

export function yearRange(from: number | null, to: number | null): string {
  if (from && to) return from === to ? `${from}` : `${from}–${to}`;
  if (from) return `${from}–`;
  if (to) return `–${to}`;
  return "Allar árgerðir";
}

export function describeFitment(f: Fitment, makes: Make[], models: Model[]): string {
  const make = makes.find((m) => m.id === f.make_id)?.name ?? "?";
  const model = f.model_id ? models.find((m) => m.id === f.model_id)?.name : "allar gerðir";
  return `${make} ${model} · ${yearRange(f.year_from, f.year_to)}`;
}
