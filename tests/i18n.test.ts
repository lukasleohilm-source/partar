import { describe, expect, it } from "vitest";
import { formatDate, formatDecimal, formatTime, timeAgo } from "@/lib/i18n";

describe("íslenskar dagsetningar án Intl", () => {
  const d = new Date("2026-10-24T14:05:00Z");
  it("tími og dagsetning", () => {
    expect(formatTime(d)).toBe("14:05");
    expect(formatDate(d)).toBe("24. október");
    expect(formatDate(d, { month: "short" })).toBe("24. okt.");
    expect(formatDate(d, { day: false, year: true })).toBe("október 2026");
    expect(formatDate(d, { weekday: true })).toBe("laugardagur, 24. október");
  });
  it("afstæður tími með réttri beygingu", () => {
    const now = d.getTime();
    const ago = (s: number) => timeAgo(new Date(now - s * 1000).toISOString(), now);
    expect(ago(10)).toBe("rétt í þessu");
    expect(ago(60)).toBe("fyrir 1 mínútu");
    expect(ago(5 * 60)).toBe("fyrir 5 mínútum");
    expect(ago(21 * 3600)).toBe("fyrir 21 klukkustund");
    expect(ago(11 * 3600)).toBe("fyrir 11 klukkustundum");
    expect(ago(86400)).toBe("í gær");
    expect(ago(3 * 86400)).toBe("fyrir 3 dögum");
    expect(ago(60 * 86400)).toBe("25. ágúst 2026");
  });
  it("tugabrot", () => {
    expect(formatDecimal(4.5)).toBe("4,5");
    expect(formatDecimal(5)).toBe("5");
  });
});

describe("enska", () => {
  const d = new Date("2026-10-24T14:05:00Z");
  it("verð, dagsetningar og afstæður tími", async () => {
    const { formatPrice } = await import("@/lib/i18n");
    expect(formatPrice(14900, "en")).toBe("14,900 kr.");
    expect(formatPrice(0, "en")).toBe("Free");
    expect(formatPrice(null, "en")).toBe("Make an offer");
    expect(formatDate(d, { weekday: true }, "en")).toBe("Saturday, 24 October");
    const now = d.getTime();
    expect(timeAgo(new Date(now - 3600_000).toISOString(), now, "en")).toBe("1 hour ago");
    expect(timeAgo(new Date(now - 3 * 86400_000).toISOString(), now, "en")).toBe("3 days ago");
    expect(formatDecimal(4.5, "en")).toBe("4.5");
  });
  it("t() þýðir, setur inn breytur og fellur aftur á íslensku", async () => {
    const { translate } = await import("@/lib/lang");
    expect(translate("en", "Leita")).toBe("Search");
    expect(translate("is", "Leita")).toBe("Leita");
    expect(translate("en", "Óþýddur texti")).toBe("Óþýddur texti");
    expect(translate("en", "{label} ({count} ólesið)", { label: "Messages", count: 2 })).toBe("Messages (2 unread)");
  });
});
