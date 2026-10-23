import {
  Activity,
  Armchair,
  CarFront,
  CircleDot,
  Cog,
  Disc,
  Ellipsis,
  Fan,
  Lightbulb,
  Package,
  Settings2,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Tákn fyrir yfirflokka (eftir slug í categories)
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  vel: Cog,
  girkassi: Settings2,
  fjodrun: Activity,
  bremsur: Disc,
  yfirbygging: CarFront,
  ljos: Lightbulb,
  rafkerfi: Zap,
  innretting: Armchair,
  "felgur-dekk": CircleDot,
  pust: Wind,
  kaeling: Fan,
  aukahlutir: Package,
  annad: Ellipsis,
};

// Styttri heiti sem passa í flokkareit á forsíðu
export const CATEGORY_SHORT: Record<string, string> = {
  vel: "Vél",
  girkassi: "Gírkassi",
  fjodrun: "Fjöðrun",
  bremsur: "Bremsur",
  yfirbygging: "Boddí",
  ljos: "Ljós",
  rafkerfi: "Rafkerfi",
  innretting: "Innrétting",
  "felgur-dekk": "Felgur & dekk",
  pust: "Púst",
  kaeling: "Kæling",
  aukahlutir: "Aukahlutir",
  annad: "Annað",
};
