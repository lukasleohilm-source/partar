"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FitmentPicker } from "@/components/listing/fitment-picker";
import { ImagePicker } from "@/components/listing/image-picker";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { CONDITIONS, KINDS, REGIONS, formatPrice, type Condition, type Kind, type Region } from "@/lib/i18n";
import type { ProcessedImage } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { YEARS, describeFitment, type Category, type Fitment, type Make, type Model } from "@/lib/vehicles";

type Props = {
  userId: string;
  makes: Make[];
  models: Model[];
  categories: Category[];
  defaultRegion: Region | null;
};

type PriceMode = "verd" | "tilbod" | "gefins";

const KIND_HELP: Record<Kind, string> = {
  part: "Einn hlutur eða sett, t.d. framljós eða felgur",
  parts_car: "Heill bíll sem er seldur í parta eða til niðurrifs",
  car: "Ökuhæfur bíll á góðu verði",
};

const STEPS = ["Tegund", "Myndir", "Upplýsingar", "Passar í", "Staðsetning"];

export function ListingForm({ userId, makes, models, categories, defaultRegion }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [kind, setKind] = useState<Kind>("part");
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<Condition | "">("");
  const [priceMode, setPriceMode] = useState<PriceMode>("verd");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [mileage, setMileage] = useState("");
  const [plate, setPlate] = useState("");
  const [fitments, setFitments] = useState<Fitment[]>([]);
  const [universal, setUniversal] = useState(false);
  const [car, setCar] = useState({ make: "", model: "", year: "" });
  const [region, setRegion] = useState<Region | "">(defaultRegion ?? "");
  const [postalCode, setPostalCode] = useState("");

  const isCar = kind !== "part";
  const parents = categories.filter((c) => c.parent_id === null);
  const priceValue = priceMode === "tilbod" ? null : priceMode === "gefins" ? 0 : Number(price || NaN);

  function carFitment(): Fitment | null {
    if (!car.make) return null;
    const year = car.year ? Number(car.year) : null;
    return { make_id: Number(car.make), model_id: car.model ? Number(car.model) : null, year_from: year, year_to: year };
  }

  function validate(s: number): string | null {
    switch (s) {
      case 1:
        return images.length === 0 ? "Settu inn að minnsta kosti eina mynd." : null;
      case 2:
        if (title.trim().length < 3) return "Fyrirsögn þarf að vera að minnsta kosti 3 stafir.";
        if (!isCar && !categoryId) return "Veldu flokk.";
        if (!condition) return "Veldu ástand.";
        if (priceMode === "verd" && !(priceValue! > 0)) return "Sláðu inn verð eða veldu „Tilboð“.";
        return null;
      case 3:
        if (isCar) return car.make && car.year ? null : "Veldu tegund og árgerð bílsins.";
        return universal || fitments.length > 0 ? null : "Bættu við að minnsta kosti einum bíl eða hakaðu í „Passar í alla bíla“.";
      case 4:
        if (!region) return "Veldu landshluta.";
        if (postalCode && !/^\d{3}$/.test(postalCode)) return "Póstnúmer er þrír tölustafir.";
        return null;
      default:
        return null;
    }
  }

  function next() {
    const err = validate(step);
    setError(err);
    if (!err) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
    }
  }

  function back() {
    setError(null);
    setStep(step - 1);
    window.scrollTo({ top: 0 });
  }

  async function publish() {
    const err = validate(4);
    if (err) return setError(err);
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const uploaded: string[] = [];
    let listingId: string | null = null;

    try {
      // 1. Vista sem draft svo triggerinn sjái fitments þegar auglýsingin birtist
      const { data: listing, error: e1 } = await supabase
        .from("listings")
        .insert({
          seller_id: userId,
          kind,
          status: "draft",
          title: title.trim(),
          description: description.trim() || null,
          category_id: isCar ? null : Number(categoryId),
          price_isk: priceValue,
          condition,
          region,
          postal_code: postalCode || null,
          part_number: (!isCar && partNumber.trim()) || null,
          mileage_km: isCar && mileage ? Number(mileage) : null,
          license_plate: (isCar && plate.trim().toUpperCase()) || null,
          universal_fit: !isCar && universal,
        })
        .select("id")
        .single();
      if (e1) throw e1;
      listingId = listing.id as string;

      // 2. Myndir
      const rows = [];
      for (const [i, img] of images.entries()) {
        const path = `${userId}/${listingId}/${img.id}.${img.ext}`;
        const { error } = await supabase.storage
          .from("listing-images")
          .upload(path, img.blob, { contentType: img.blob.type, cacheControl: "31536000" });
        if (error) throw error;
        uploaded.push(path);
        rows.push({ listing_id: listingId, path, sort: i, width: img.width, height: img.height });
      }
      const { error: e2 } = await supabase.from("listing_images").insert(rows);
      if (e2) throw e2;

      // 3. Passar í
      const fits = isCar ? [carFitment()!] : universal ? [] : fitments;
      if (fits.length) {
        const { error: e3 } = await supabase
          .from("listing_fitments")
          .insert(fits.map((f) => ({ ...f, listing_id: listingId })));
        if (e3) throw e3;
      }

      // 4. Birta
      const { error: e4 } = await supabase.from("listings").update({ status: "active" }).eq("id", listingId);
      if (e4) throw e4;

      images.forEach((img) => URL.revokeObjectURL(img.url));
      router.push(`/auglysing/${listingId}`);
    } catch {
      // Hreinsa hálfkláraða auglýsingu
      if (uploaded.length) await supabase.storage.from("listing-images").remove(uploaded);
      if (listingId) await supabase.from("listings").delete().eq("id", listingId);
      setError("Ekki tókst að birta auglýsinguna. Athugaðu nettenginguna og reyndu aftur.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-5">
        <div className="mb-3 flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={back} aria-label="Til baka" className="-ml-2 px-2 text-2xl text-stone-600">
              ‹
            </button>
          )}
          <h1 className="text-xl font-bold">{step === 0 ? "Hvað ertu að selja?" : STEPS[step]}</h1>
          <span className="ml-auto text-sm text-stone-500">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-orange-600" : "bg-stone-200"}`} />
          ))}
        </div>
      </header>

      {step === 0 && (
        <div className="space-y-3">
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setStep(1);
              }}
              className={`block w-full rounded-2xl border-2 bg-white p-4 text-left active:bg-stone-50 ${
                kind === k ? "border-orange-500" : "border-transparent"
              }`}
            >
              <span className="block text-lg font-semibold">{KINDS[k]}</span>
              <span className="text-sm text-stone-500">{KIND_HELP[k]}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && <ImagePicker images={images} onChange={setImages} />}

      {step === 2 && (
        <div className="space-y-4">
          <label className="block">
            <span className={labelClass}>Fyrirsögn</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder={isCar ? "t.d. Toyota Yaris 2008, keyrður 180 þús." : "t.d. Framljós vinstra megin"}
              className={inputClass}
            />
          </label>

          {!isCar && (
            <label className="block">
              <span className={labelClass}>Flokkur</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                <option value="">Veldu flokk…</option>
                {parents.map((p) => {
                  const children = categories.filter((c) => c.parent_id === p.id);
                  if (!children.length) {
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    );
                  }
                  return (
                    <optgroup key={p.id} label={p.name}>
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value={p.id}>{p.name} – annað</option>
                    </optgroup>
                  );
                })}
              </select>
            </label>
          )}

          <fieldset>
            <legend className={labelClass}>Ástand</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CONDITIONS) as Condition[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  aria-pressed={condition === c}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    condition === c ? "border-orange-600 bg-orange-600 text-white" : "border-stone-300 bg-white"
                  }`}
                >
                  {CONDITIONS[c]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Verð</legend>
            <div className="mb-2 grid grid-cols-3 gap-1 rounded-xl bg-stone-200 p-1">
              {(
                [
                  ["verd", "Verð"],
                  ["tilbod", "Tilboð"],
                  ["gefins", "Gefins"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPriceMode(mode)}
                  aria-pressed={priceMode === mode}
                  className={`rounded-lg py-2 text-sm font-medium ${priceMode === mode ? "bg-white shadow-sm" : "text-stone-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {priceMode === "verd" && (
              <div className="relative">
                <input
                  value={price ? Number(price).toLocaleString("is-IS") : ""}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  inputMode="numeric"
                  placeholder="0"
                  aria-label="Verð í krónum"
                  className={`${inputClass} pr-12`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500">kr.</span>
              </div>
            )}
          </fieldset>

          {isCar && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Akstur (km)</span>
                <input
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value.replace(/\D/g, "").slice(0, 7))}
                  inputMode="numeric"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Bílnúmer</span>
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="AB123"
                  autoCapitalize="characters"
                  className={inputClass}
                />
              </label>
            </div>
          )}

          {!isCar && (
            <label className="block">
              <span className={labelClass}>Vörunúmer (valfrjálst)</span>
              <input
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                maxLength={60}
                placeholder="OEM-númer ef það er þekkt"
                className={inputClass}
              />
            </label>
          )}

          <label className="block">
            <span className={labelClass}>Lýsing</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={5}
              placeholder="Ástand, gallar, hvað fylgir, hvar er hægt að sækja…"
              className={inputClass}
            />
          </label>
        </div>
      )}

      {step === 3 &&
        (isCar ? (
          <div className="space-y-3 rounded-xl bg-white p-4">
            <label className="block">
              <span className={labelClass}>Tegund</span>
              <select
                value={car.make}
                onChange={(e) => setCar({ make: e.target.value, model: "", year: car.year })}
                className={inputClass}
              >
                <option value="">Veldu tegund…</option>
                {makes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Gerð</span>
              <select
                value={car.model}
                onChange={(e) => setCar({ ...car, model: e.target.value })}
                disabled={!car.make}
                className={inputClass}
              >
                <option value="">Önnur / óþekkt</option>
                {models
                  .filter((m) => String(m.make_id) === car.make)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Árgerð</span>
              <select value={car.year} onChange={(e) => setCar({ ...car, year: e.target.value })} className={inputClass}>
                <option value="">Veldu…</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone-600">
              Í hvaða bíla passar hluturinn? Þú getur bætt við mörgum. Kaupendur sem velja sinn bíl sjá auglýsinguna.
            </p>
            <FitmentPicker
              makes={makes}
              models={models}
              fitments={fitments}
              onChange={setFitments}
              universal={universal}
              onUniversalChange={setUniversal}
            />
          </>
        ))}

      {step === 4 && (
        <div className="space-y-4">
          <label className="block">
            <span className={labelClass}>Landshluti</span>
            <select value={region} onChange={(e) => setRegion(e.target.value as Region)} className={inputClass}>
              <option value="">Veldu…</option>
              {Object.entries(REGIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Póstnúmer (valfrjálst)</span>
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder="t.d. 600"
              className={inputClass}
            />
          </label>

          <section className="rounded-2xl bg-white p-4">
            <h2 className="mb-3 font-semibold">Yfirlit</h2>
            <div className="flex gap-3">
              {images[0] && (
                // eslint-disable-next-line @next/next/no-img-element -- object URL
                <img src={images[0].url} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{title}</p>
                <p className="text-lg font-bold text-orange-600">{formatPrice(priceValue)}</p>
                <p className="text-sm text-stone-500">
                  {KINDS[kind]} · {condition && CONDITIONS[condition]} · {images.length} myndir
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-stone-600">
              <span className="font-medium">Passar í: </span>
              {isCar
                ? carFitment() && describeFitment(carFitment()!, makes, models)
                : universal
                  ? "Alla bíla"
                  : fitments.map((f) => describeFitment(f, makes, models)).join("; ")}
            </p>
          </section>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {step > 0 && (
        <div className="mt-6 space-y-2">
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={primaryButton}>
              Áfram
            </button>
          ) : (
            <button type="button" onClick={publish} disabled={submitting} className={primaryButton}>
              {submitting ? "Birti auglýsingu…" : "Birta auglýsingu"}
            </button>
          )}
          <button type="button" onClick={back} disabled={submitting} className={secondaryButton}>
            Til baka
          </button>
        </div>
      )}
    </div>
  );
}
