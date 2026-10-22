# Partar

Markaðstorg fyrir notaða varahluti, partabíla og ódýra bíla. Next.js 15 + Supabase.

## Keyrsla á eigin vél

Krefst **Node.js 20+** og **Docker Desktop** (Supabase keyrir staðbundið í Docker).

```bash
npm install
npx supabase start          # ræsir Postgres, Auth, Storage, Realtime og Mailpit
```

Afritaðu `.env.local.example` í `.env.local` og settu inn `API URL` og `anon key` (eða `Publishable key`)
sem `supabase start` prentar út. Svo:

```bash
npm run dev                 # http://localhost:3000
```

- **Tölvupóstur (töfrahlekkir):** http://localhost:54324 (Mailpit). Enginn raunverulegur póstur er sendur.
- **Supabase Studio:** http://localhost:54323
- **Endurstilla gagnagrunn** (keyrir migrations + seed upp á nýtt): `npx supabase db reset`

## Uppbygging

- `supabase/migrations/` – skema, föll/triggerar (leit, „óska eftir“, spjall), RLS og myndageymsla
- `supabase/seed.sql` – bíltegundir, gerðir og flokkar
- `supabase/templates/` – íslensk tölvupóstsniðmát
- `src/lib/supabase/` – Supabase-biðlarar fyrir vafra, server og middleware
- `src/app/` – síður (slóðir á íslensku)

Auglýsing er fyrst vistuð sem `draft`, myndir og „passar í“ (fitments) settar inn, og svo birt
(`status = 'active'`). Þá keyrir `match_wanted()` og sendir tilkynningar til þeirra sem óska eftir.
