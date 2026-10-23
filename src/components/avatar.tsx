// Upphafsstafur á lituðum hring; liturinn ræðst af nafninu svo hver notandi fær sinn lit
const GRADIENTS = [
  "from-orange-400 to-red-500",
  "from-sky-400 to-indigo-500",
  "from-emerald-400 to-teal-600",
  "from-fuchsia-400 to-purple-600",
  "from-amber-400 to-orange-600",
  "from-lime-400 to-green-600",
];

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${GRADIENTS[h % GRADIENTS.length]}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
