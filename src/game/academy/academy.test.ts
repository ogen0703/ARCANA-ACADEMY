import { describe, expect, it } from "vitest";
import { COURSES, HOUSES, SPELLS, UNITS, houseFor } from "./content";
import { advancedConditions, applyLesson, lessonGain, spellConditions, unitOpen } from "./engine";
import { createCharacter } from "../character/create";
import { MAGIC_KEYS, type Character } from "../../schemas";

let n = 0; const id = () => "x" + n++;
const take = (ch: Character, unit: number, correct = true, todayCount = 0) => applyLesson(ch, { id: id(), course: "elemental", unit, correct, todayCount }, "t", id);

describe("授業の中身", () => {
  it("6講座×8単元、答えと呪文の参照が正しい", () => {
    for (const k of MAGIC_KEYS) {
      expect(UNITS[k]).toHaveLength(8); expect(COURSES[k].teacher.name).toBeTruthy();
      UNITS[k].forEach((u, i) => {
        expect(u.choices[u.answer]).toBeTruthy();
        if (i === 2 || i === 4 || i === 7) expect(SPELLS.find((s) => s.id === u.spell)?.system).toBe(k); else expect(u.spell).toBeUndefined();
      });
    }
    expect(SPELLS).toHaveLength(18); expect(HOUSES).toHaveLength(3);
  });
});

describe("授業と呪文", () => {
  it("1コマで熟練度とEXP。基本ステータスは変わらない", () => {
    const ch = createCharacter("げんた", "t");
    const r = take(ch, 0);
    expect(r.character.academy.proficiency.elemental).toBe(15);
    expect(r.character.experience).toBe(8);
    expect(r.character.basicStats).toEqual(ch.basicStats);
  });
  it("順番どおり・1日3コマまで・2回目は半分", () => {
    const ch = createCharacter("げんた", "t");
    expect(() => take(ch, 1)).toThrow();
    expect(() => take(ch, 0, true, 3)).toThrow();
    const a = take(ch, 0).character;
    expect(lessonGain(a, "elemental", 0, true).prof).toBe(7.5);
  });
  it("単元3まで受けると初級の呪文を覚える。中級は現実の成長も必要", () => {
    let ch = createCharacter("げんた", "t");
    for (const u of [0, 1, 2]) ch = take(ch, u).character;
    expect(ch.learnedSpells).toContain("elemental-1");
    for (const u of [3, 4]) ch = take(ch, u).character;
    expect(ch.academy.proficiency.elemental).toBeGreaterThanOrEqual(60);
    expect(ch.learnedSpells).not.toContain("elemental-2");
    const mid = SPELLS.find((s) => s.id === "elemental-2")!;
    expect(spellConditions(ch, mid).conds.filter((c) => !c.met).map((c) => c.label).join()).toContain("身体能力");
    ch = { ...ch, basicStats: { ...ch.basicStats, physical: 30 }, magicAffinity: { ...ch.magicAffinity, elemental: { ...ch.magicAffinity.elemental, signals: 6 } } };
    expect(spellConditions(ch, mid).ok).toBe(true);
    expect(spellConditions(ch, SPELLS.find((s) => s.id === "elemental-3")!).ok).toBe(false);
  });
  it("寮は2系統の合計で決まる", () => {
    expect(houseFor({ astral: 70, ancient: 60, mind: 20, nature: 20, elemental: 30, creation: 30 }).name).toBe("星環の寮");
    expect(houseFor({ elemental: 70, creation: 45 }).name).toBe("暁火の寮");
  });
});

describe("上級課程(Phase 5b)", () => {
  it("単元5+熟練度60+先生の信頼40でひらき、熟練度の伸びが大きい", () => {
    let ch = createCharacter("げんた", "t");
    for (const u of [0, 1, 2, 3, 4]) ch = take(ch, u).character;
    ch = { ...ch, academy: { ...ch.academy, proficiency: { ...ch.academy.proficiency, elemental: 60 } } };
    expect(unitOpen(ch, "elemental", 5)).toBe(false);
    expect(advancedConditions(ch, "elemental").conds.find((c) => !c.met)?.label).toContain("信頼");
    ch = { ...ch, relationships: [{ id: "t-elemental", name: "ガレス", bond: 40 }] };
    expect(unitOpen(ch, "elemental", 5)).toBe(true);
    expect(lessonGain(ch, "elemental", 5, true).prof).toBeGreaterThan(lessonGain(ch, "elemental", 0, true).prof * 2);
  });
  it("上級呪文は単元8と現実の成長が要る", () => {
    let ch = createCharacter("げんた", "t");
    const sp = SPELLS.find((s) => s.id === "elemental-3")!;
    expect(spellConditions(ch, sp).conds.some((c) => c.label.includes("単元8"))).toBe(true);
    ch = { ...ch, academy: { proficiency: { elemental: 100 }, units: { elemental: [1, 1, 1, 1, 1, 1, 1, 1] } }, basicStats: { ...ch.basicStats, physical: 45 }, magicAffinity: { ...ch.magicAffinity, elemental: { ...ch.magicAffinity.elemental, value: 60 } } };
    expect(spellConditions(ch, sp).ok).toBe(true);
  });
});
