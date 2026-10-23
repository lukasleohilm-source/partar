# Partar

Markaðstorg fyrir notaða varahluti, partabíla og ódýra bíla. Next.js 15 + Supabase.

## Keyrsla á eigin vél

Krefst **Node.js 20+** og **Docker Desktop** (Supabase keyrir staðbundið í Docker).

> **Windows PowerShell:** ef `npm` gefur villuna „running scripts is disabled on this system“,
> notaðu `npm.cmd` og `npx.cmd` í staðinn (t.d. `npm.cmd run dev`).

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

## Í loftinu

**https://partar.lukels255.com**: Cloudflare Worker `partar` (OpenNext). Gagnagrunnur: Supabase-ský
`tkxkrbetopzhstodavzm` (eu-west-1).

```bash
npm.cmd run cf:deploy       # byggir með OpenNext og birtir (þarf `npx wrangler login`)
npx.cmd supabase db push    # nýjar migrations í skýið
npm.cmd test                # gagnagrunnsprófanir (PGlite)
```

`next build` og `next dev` nota sömu `.next`-möppu; stöðvaðu þróunarþjóninn áður en þú byggir.

### Sjálfvirk birting (Cloudflare Workers Builds)

Kóðinn er á GitHub (`lukasleohilm-source/partar`). Í Cloudflare: **Workers & Pages → partar → Settings → Builds → Connect** og velja safnið, grein `main`.

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Build variables (límdar inn í kóðann við build, allar opinberar):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

Leyndarbreytan `VAPID_PRIVATE_JWK` og `SITE_URL` eru þegar á Workernum og þarf ekki að setja aftur.
Migrations eru ekki keyrðar sjálfkrafa: `npx.cmd supabase db push` áður en kóði sem þarf þær fer upp.

## Uppbygging

- `supabase/migrations/` – skema, föll/triggerar (leit, „óska eftir“, spjall), RLS og myndageymsla
- `supabase/seed.sql` – bíltegundir, gerðir og flokkar
- `supabase/templates/` – íslensk tölvupóstsniðmát
- `src/lib/supabase/` – Supabase-biðlarar fyrir vafra, server og middleware
- `src/app/` – síður (slóðir á íslensku)

Auglýsing er fyrst vistuð sem `draft`, myndir og „passar í“ (fitments) settar inn, og svo birt
(`status = 'active'`). Þá keyrir `match_wanted()` og sendir tilkynningar til þeirra sem óska eftir.
