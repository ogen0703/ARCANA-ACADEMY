import { describe, expect, it } from "vitest";
import { ambienceOf, seasonOf, timeOf, weatherOf } from "./ambience";
describe("学院の時間帯・季節・天候", () => {
  it("時間帯", () => {
    expect(timeOf(new Date(2026, 10, 15, 6))).toBe("dawn");
    expect(timeOf(new Date(2026, 10, 15, 12))).toBe("day");
    expect(timeOf(new Date(2026, 10, 15, 17))).toBe("dusk");
    expect(timeOf(new Date(2026, 10, 15, 23))).toBe("night");
  });
  it("季節", () => { expect(seasonOf(new Date(2026, 10, 15))).toBe("autumn"); expect(seasonOf(new Date(2026, 0, 1))).toBe("winter"); });
  it("天候は同じ日なら同じ", () => {
    expect(weatherOf(new Date(2026, 10, 15, 1))).toBe(weatherOf(new Date(2026, 10, 15, 23)));
    expect(ambienceOf(new Date(2026, 10, 15, 23)).label).toContain("秋");
  });
});
