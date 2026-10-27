---
name: Partar
description: Dökkt, rólegt markaðstorg fyrir notaða varahluti. Grunnurinn er Linear (næstum svartur strigi, yfirborðsstigi, fínar línur, þétt letur) og markaðshlutinn er Airbnb (myndin fyrst, hljóðlátur texti undir). Einn litur, Partar-appelsínugulur, ber aðgerðir og vörumerki.

colors:
  canvas: "#08090a"
  surface-1: "#0f1011"
  surface-2: "#151617"
  surface-3: "#1b1c1e"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  accent: "#cf470b"        # hnappar með hvítum texta (4.6:1)
  accent-hover: "#e0560f"
  accent-ink: "#fb923c"    # appelsínugulur texti og tákn á dökku
  success: "#27a644"
  danger: "#ef4444"

typography:
  family: Inter (variable, cv11 + ss01), ein fjölskylda fyrir allt
  display: 64px / 600 / 1.02 / -0.035em   # h1 á forsíðu í tölvu (40px í síma)
  headline: 28px / 600 / 1.15 / -0.02em
  title: 20px / 600 / 1.25 / -0.01em      # fyrirsagnir hluta
  body-lg: 18px / 400 / 1.55
  body: 16px / 400 / 1.5
  body-sm: 14px / 400 / 1.45
  caption: 13px / 400 / 1.4
  price: tabular-nums, 600, ink (ekki appelsínugult)

rounded:
  sm: 6px      # merki og smáir hnappar
  md: 8px      # allir hnappar og reitir
  lg: 12px     # spjöld, myndir auglýsinga
  xl: 16px     # stórir fletir
  full: 9999px # leitarstika, uppáhaldshjarta, avatar

spacing:
  base: 4px
  gutter: 16px (sími) / 32px (tölva)
  grid-gap: 24px lárétt, 32px lóðrétt í auglýsingalista
  section: 64px (sími 40px)
  container: 1440px
---

## Reglur

**Strigi og dýpt (Linear).** Dýpt kemur af yfirborðsstiganum canvas → surface-1 → surface-2 og 1px `hairline`-línum. Engir skuggar á hlutum í hvíld, engir litaðir ljómar, engir skrautlegir litaskalar eða mynstur í bakgrunni. Skuggi aðeins á það sem raunverulega svífur (valmyndir, gluggar).

**Einn litur.** `accent` er á aðalaðgerð (Selja, Leita, Vista), virku ástandi og vörumerkinu. Verð er í `ink`, ekki appelsínugult. Enginn litaður "áherslutexti" í fyrirsögnum.

**Myndin fyrst (Airbnb).** Auglýsingaspjald er mynd (4:3, `rounded.lg`) og þrjár hljóðlátar línur undir á striganum sjálfum, enginn kassi utan um. Titill (15px/500 ink), staður og tími (13px ink-subtle), verð (15px/600 ink). Hover: myndin stækkar örlítið (1.03) á 400ms.

**Letur.** Ein leturgerð. Stórt og lítið, ekkert þar á milli. Neikvætt línubil á stórum fyrirsögnum, aldrei örsmáir hástafamerkimiðar með auknu bili. Setningahástafir alls staðar.

**Hnappar.** `rounded.md`, flatir, einn fyllilitur. Aðal: accent + hvítur texti. Auka: surface-2 + hairline. Leitarstika og hjarta eru `rounded.full` (Airbnb).

**Tákn.** Lucide, 1.75 strik, í ink-subtle eða accent-ink. Aldrei tákn í lituðum ferningi sem skraut.

**Hreyfing.** Ein höfundarstund: þrívíddarfelgan á forsíðunni í tölvu, sem snýst hægt og hallar sér að músinni. Annars aðeins svörun á stýringum (hover, press, focus), ease-out 150–250ms. Allt virðir `prefers-reduced-motion`.

**Vafraflötur.** `::selection` í accent/35, `caret-color` accent-ink, dökk skrunstika, focus-hringur 2px accent-ink með 2px bili.

## Þrívíddarfelgan (hugmyndin)

Á forsíðunni verður notaður varahlutur að aðalmyndinni: álfelga á dekki sem snýst hægt, og eini appelsínuguli hluturinn í henni er bremsudælan sem sést á milli teinanna, sami litur og "Selja". Byggð í kóða með Three.js (engin módelskrá), hlaðin aðeins í tölvu, eftir að síðan er komin upp, og stöðvuð þegar hún sést ekki.
