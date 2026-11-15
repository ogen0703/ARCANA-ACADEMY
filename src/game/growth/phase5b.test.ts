import { describe, expect, it } from "vitest";
import { personalityAt, recordingSince, turningPoints, monthlyPersonality, biggestShift } from "./personalityHistory";
import { auraOf, circleOf, rankOf } from "./appearance";
import { createCharacter } from "../character/create";
import type { Character, ExperienceEvent } from "../../schemas";

const mk = (id: string, date: string, sig: Record<string, number>): ExperienceEvent => {
  const g = { exp: 30, stats: {}, personalitySignals: sig, magicSignals: {}, notes: [], engine: "t" };
  return { id, date, source: "manual", category: "sports", title: "経験" + id, description: "", difficulty: 3, duration: 0, reflection: "", analysisStatus: "applied", proposedGrowth: g, approvedGrowth: g, createdAt: date, appliedAt: null } as ExperienceEvent;
};

describe("性格の移り変わり", () => {
  const evs = Array.from({ length: 12 }, (_, i) => mk(`e${i}`, `2026-0${i < 6 ? 8 : 9}-${String(10 + i).padStart(2, "0")}`, { decisiveness: 2 }));
  it("その日までの経験だけで性格を求める(5件で形になる)", () => {
    expect(personalityAt(evs, "2026-08-11").decisiveness).toBeNull();
    expect(personalityAt(evs, "2026-08-31").decisiveness).toBeGreaterThan(20);
    expect(personalityAt(evs, "2026-09-30").decisiveness!).toBeGreaterThan(personalityAt(evs, "2026-08-31").decisiveness!);
  });
  it("30日で5以上動いたら心の転機。きっかけの経験つき", () => {
    const t = turningPoints(evs);
    expect(t.length).toBeGreaterThan(0); expect(t[0].key).toBe("decisiveness"); expect(t[0].events.length).toBeGreaterThan(0);
  });
  it("月ごと・期間の変化・記録中の判定", () => {
    expect(monthlyPersonality(evs, "2026-10-05").map((m) => m.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(biggestShift(evs, "2026-09-01", "2026-09-30")?.label).toBe("決断力");
    expect(recordingSince(evs, null, "2026-08-20").ready).toBe(false);
    expect(recordingSince(evs, null, "2026-10-01").ready).toBe(true);
  });
});

describe("見た目の進化", () => {
  const base = createCharacter("げんた", "t");
  it("位はレベルと呪文で決まる", () => {
    expect(rankOf(base).index).toBe(0);
    const mage: Character = { ...base, level: 10, learnedSpells: ["astral-2", "mind-2", "nature-2"] };
    expect(rankOf(mage).name).toBe("正魔法使い");
    expect(rankOf({ ...mage, level: 20, learnedSpells: [...mage.learnedSpells, "astral-3", "elemental-3"] }).index).toBe(2);
    expect(rankOf({ ...base, level: 30 }).next[1].met).toBe(false);
  });
  it("オーラはいちばん高い適性の色。近いと2色。魔法陣は系統ごとに輪", () => {
    const aff = (v: Partial<Record<string, number>>) => Object.fromEntries(Object.entries(base.magicAffinity).map(([k, a]) => [k, { ...a, value: v[k] ?? 10 }])) as Character["magicAffinity"];
    expect(auraOf({ ...base, magicAffinity: aff({ elemental: 65 }) })).toMatchObject({ system: "elemental", level: 2 });
    expect(auraOf({ ...base, magicAffinity: aff({ elemental: 65, mind: 62 }) }).colors).toHaveLength(2);
    expect(circleOf({ ...base, learnedSpells: ["astral-1", "astral-2", "mind-1"] }).rings).toHaveLength(2);
  });
});
