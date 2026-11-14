import { describe, expect, it } from "vitest";
import { affinityValue, applyDiagnosis, diagnose, personalityValue, DIAGNOSIS } from "./formation";
import { applyGrowth, proposeGrowth } from "./engine";
import { createCharacter } from "../character/create";
import type { ExperienceEvent } from "../../schemas";

const ev = (o: Partial<ExperienceEvent> = {}): ExperienceEvent => ({
  id: "e1", date: "2026-11-14", source: "manual", category: "sports", title: "サッカーの試合", description: "", difficulty: 3, duration: 90,
  reflection: "", analysisStatus: "pending", proposedGrowth: null, approvedGrowth: null, createdAt: "2026-11-14T00:00:00Z", appliedAt: null, ...o,
});
let n = 0; const id = () => "h" + n++;

describe("性格の形成", () => {
  it("根拠が5件たまるまでは形にならない", () => {
    expect(personalityValue(4, 30)).toBeNull();
    expect(personalityValue(5, 0)).toBe(20);
    expect(personalityValue(5, 15)).toBeGreaterThan(personalityValue(5, 5)!);
    expect(personalityValue(50, 1000)).toBeLessThanOrEqual(100);
  });
  it("経験を重ねると負けず嫌いが形成される", () => {
    let ch = createCharacter("げんた", "t");
    for (let i = 0; i < 5; i++) {
      const e = ev({ id: "s" + i, date: `2026-10-${10 + i * 8}`, title: "試合" + i });
      ch = applyGrowth(ch, e, proposeGrowth(e, []), "t", id).character;
    }
    expect(ch.personality.competitiveness.evidence).toBe(5);
    expect(ch.personality.competitiveness.value).not.toBeNull();
    expect(ch.personality.empathy.value).toBeNull();
  });
});

describe("AIの読み取り", () => {
  it("能力値は変えず、性格・魔法の兆しにだけ足す", () => {
    const plain = proposeGrowth(ev(), []);
    const withAi = proposeGrowth(ev({ ai: { by: "test", at: "t", summary: "", personality: { empathy: 1 }, magic: { mind: 0.5 }, reasons: [] } }), []);
    expect(withAi.stats).toEqual(plain.stats);
    expect(withAi.exp).toBe(plain.exp);
    expect(withAi.personalitySignals.empathy).toBeGreaterThan(0);
    expect(plain.personalitySignals.empathy).toBeUndefined();
    expect(withAi.magicSignals.mind).toBeGreaterThan(0);
  });
});

describe("入学診断", () => {
  it("いちばん多く選んだ系統が70、選ばなかった系統は20", () => {
    const astralIdx = DIAGNOSIS.map((q) => Math.max(0, q.options.findIndex((o) => o.magic === "astral")));
    const b = diagnose(astralIdx);
    expect(b.astral).toBe(70);
    expect(Math.min(...Object.values(b))).toBeGreaterThanOrEqual(20);
    expect(() => diagnose([0])).toThrow();
  });
  it("診断は1回だけ。兆しがあれば適性が上乗せされる", () => {
    const ch0 = createCharacter("げんた", "t");
    ch0.magicAffinity.elemental.signals = 20;
    const ch = applyDiagnosis(ch0, diagnose(DIAGNOSIS.map(() => 0)), "t");
    expect(ch.magicAffinity.elemental.value).toBeGreaterThan(ch.magicAffinity.elemental.base!);
    expect(() => applyDiagnosis(ch, diagnose(DIAGNOSIS.map(() => 0)), "t")).toThrow();
    expect(affinityValue(null, 50)).toBeNull();
  });
});
