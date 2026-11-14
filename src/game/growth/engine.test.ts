import { describe, expect, it } from "vitest";
import { applyGrowth, finalizeStats, growthPoints, levelProgress, proposeGrowth, repeatCount, totalExpForLevel } from "./engine";
import { createCharacter } from "../character/create";
import type { ExperienceEvent } from "../../schemas";

const ev = (o: Partial<ExperienceEvent> = {}): ExperienceEvent => ({
  id: "e1", date: "2026-11-14", source: "manual", category: "sports", title: "サッカーの試合", description: "", difficulty: 3, duration: 90,
  reflection: "", analysisStatus: "pending", proposedGrowth: null, approvedGrowth: null, createdAt: "2026-11-14T00:00:00Z", appliedAt: null, ...o,
});
let n = 0; const id = () => "h" + n++;

describe("成長ポイント", () => {
  it("難易度・継続時間・振り返りで増える", () => {
    const a = growthPoints({ difficulty: 3, duration: 0, reflection: "" }, 0).total;
    const b = growthPoints({ difficulty: 3, duration: 120, reflection: "" }, 0).total;
    const c = growthPoints({ difficulty: 3, duration: 120, reflection: "あ".repeat(30) }, 0).total;
    expect(a).toBe(3); expect(b).toBeCloseTo(4.5); expect(c).toBeCloseTo(5.4);
  });
  it("同じ経験の繰り返しは伸びが減る", () => {
    const past = [ev({ id: "p1", analysisStatus: "applied", date: "2026-11-12" }), ev({ id: "p2", analysisStatus: "applied", date: "2026-11-01" })];
    expect(repeatCount(ev(), past)).toBe(1); // 7日以内の1回だけ
    expect(growthPoints({ difficulty: 3, duration: 0, reflection: "" }, 1).total).toBeCloseTo(2);
  });
});

describe("能力値の確定", () => {
  const ch = createCharacter("げんた", "2026-01-01T00:00:00Z");
  it("1回の上限は3、能力値が高いほど伸びにくい", () => {
    const f = finalizeStats({ physical: 10 }, ch.basicStats);
    expect(f.physical).toBeCloseTo(2.7); // min(10,3) × (100-10)/100
  });
  it("100を超えない", () => {
    const s = { ...ch.basicStats, physical: 99.9 };
    expect(finalizeStats({ physical: 3 }, s).physical ?? 0).toBeLessThanOrEqual(0.1);
  });
  it("1つだけ突出した能力は伸びが半分", () => {
    const s = { ...ch.basicStats, physical: 60 };
    expect(finalizeStats({ physical: 3 }, s).physical).toBeCloseTo(0.6); // 3×0.4×0.5
  });
});

describe("反映", () => {
  it("サッカーは身体能力・精神・意志力が上がり、経験値と履歴が残る", () => {
    const ch = createCharacter("げんた", "2026-01-01T00:00:00Z");
    const e = ev();
    const g = proposeGrowth(e, []);
    expect(Object.keys(g.stats).sort()).toEqual(["physical", "spirit", "willpower"]);
    const { character, history } = applyGrowth(ch, e, g, "2026-11-14T01:00:00Z", id);
    expect(character.basicStats.physical).toBeGreaterThan(10);
    expect(character.experience).toBe(g.exp);
    expect(character.appliedEventIds).toContain("e1");
    expect(history.some((h) => h.kind === "exp")).toBe(true);
    expect(() => applyGrowth(character, e, g, "x", id)).toThrow();
  });
  it("経験値がたまるとレベルが上がる", () => {
    const ch = { ...createCharacter("げんた", "x"), experience: 95 };
    const { character } = applyGrowth(ch, ev({ id: "e2" }), { ...proposeGrowth(ev(), []), exp: 10 }, "y", id);
    expect(character.level).toBe(2);
    expect(totalExpForLevel(2)).toBe(100);
    expect(levelProgress(character).inLevel).toBe(5);
  });
});
