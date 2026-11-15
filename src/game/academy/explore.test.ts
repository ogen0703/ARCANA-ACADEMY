import { describe, expect, it } from "vitest";
import { applyExploration, canMakeWand, claimTeacherQuest, claimWeekly, makeWand, teacherQuestStatus, weekStart, weeklyProgress, weeklyQuestsFor, weeklyStreak } from "./exploreEngine";
import { DISCOVERIES, PLACES, MATERIALS } from "./explore";
import { SPELLS } from "./content";
import { createCharacter } from "../character/create";
import type { Character, ExperienceEvent } from "../../schemas";

let n = 0; const id = () => "e" + n++;
const go = (ch: Character, place: string, steps: [string, string][], todayCount = 0) => applyExploration(ch, { id: id(), place, steps: steps.map(([room, method]) => ({ room, method })), todayCount }, "t", id);

describe("探索の中身", () => {
  it("部屋の呪文・素材・発見の参照が正しい", () => {
    for (const p of PLACES) for (const r of p.rooms) {
      r.spells.forEach((s) => expect(SPELLS.some((x) => x.id === s)).toBe(true));
      r.items.forEach((i) => expect(MATERIALS.some((m) => m.id === i)).toBe(true));
      if (r.discovery) expect(DISCOVERIES.some((d) => d.id === r.discovery)).toBe(true);
      expect(r.spells.length + r.alts.length + (r.passWithout ? 1 : 0)).toBeGreaterThan(0);
    }
  });
});

describe("探索", () => {
  it("代わりの方法で進み、素材とEXP。能力値は変わらない", () => {
    const ch = createCharacter("げんた", "t");
    const r = go(ch, "temple", [["t1", "alt:0"], ["t2", "alt:0"], ["t3", "skip"], ["t4", "alt:0"]]);
    expect(r.items).toEqual({ stardust: 1, candlestand: 1, glowmoss: 1 });
    expect(r.discoveries).toEqual([]);
    expect(r.exp).toBe(6);
    expect(r.character.basicStats).toEqual(ch.basicStats);
    expect(r.completed).toBe(false);
  });
  it("覚えていない呪文や順番違い、1日の上限は拒否", () => {
    const ch = createCharacter("げんた", "t");
    expect(() => go(ch, "temple", [["t1", "alt:0"], ["t2", "spell:astral-1"]])).toThrow();
    expect(() => go(ch, "temple", [["t2", "alt:0"]])).toThrow();
    expect(() => go(ch, "temple", [["t1", "alt:0"]], 2)).toThrow();
    expect(() => go(ch, "archive", [["a1", "alt:0"]])).toThrow(); // 単元2が必要
  });
  it("呪文で発見。最奥で称号。発見は1回だけ", () => {
    let ch: Character = { ...createCharacter("げんた", "t"), learnedSpells: ["astral-1", "ancient-1", "creation-1", "astral-2", "ancient-2"] };
    const steps: [string, string][] = [["t1", "alt:1"], ["t2", "spell:astral-1"], ["t3", "spell:ancient-1"], ["t4", "alt:0"], ["t5", "spell:creation-1"], ["t6", "spell:astral-2"], ["t7", "spell:ancient-2"]];
    const r = go(ch, "temple", steps);
    expect(r.discoveries).toEqual(["d-stele", "d-ceiling", "d-altar"]);
    expect(r.exp).toBe(10); expect(r.completed).toBe(true);
    expect(r.character.titles.map((t) => t.name)).toContain("廃神殿の踏破者");
    ch = r.character;
    expect(go(ch, "temple", steps).discoveries).toEqual([]);
  });
});

describe("杖と先生の課題", () => {
  it("星の欠片と診断で杖。1回だけ", () => {
    let ch: Character = { ...createCharacter("げんた", "t"), diagnosedAt: "t", inventory: [{ id: "starshard", name: "星の欠片", qty: 1 }] };
    ch.magicAffinity.elemental.base = 70;
    ch = makeWand(ch, "t");
    expect(ch.history.wand).toBe("赤樫と星の欠片の杖");
    expect(ch.inventory).toEqual([]);
    expect(canMakeWand(ch).ok).toBe(false);
  });
  it("単元2で課題が出て、条件を満たすと報告できる", () => {
    let ch: Character = { ...createCharacter("げんた", "t"), inventory: [{ id: "glowmoss", name: "光る苔", qty: 1 }] };
    expect(teacherQuestStatus(ch, "q-nature").unlocked).toBe(false);
    ch = { ...ch, academy: { proficiency: { nature: 20 }, units: { nature: [1, 1, 0, 0, 0] } } };
    expect(teacherQuestStatus(ch, "q-nature")).toMatchObject({ unlocked: true, met: true, claimed: false });
    const r = claimTeacherQuest(ch, "q-nature", "t", id);
    expect(r.character.academy.proficiency.nature).toBe(30);
    expect(r.character.titles.map((t) => t.name)).toContain("芽吹きを待つ者");
    expect(() => claimTeacherQuest(r.character, "q-nature", "t", id)).toThrow();
  });
});

describe("週替わりの課題", () => {
  const ev = (date: string, category: ExperienceEvent["category"], reflection = ""): ExperienceEvent => ({ id: id(), date, source: "manual", category, title: "x", description: "", difficulty: 2, duration: 0, reflection, analysisStatus: "applied", proposedGrowth: null, approvedGrowth: null, createdAt: "t", appliedAt: "t" });
  it("週は月曜はじまり、同じ週は同じ3つ", () => {
    expect(weekStart(new Date(2026, 10, 15))).toBe("2026-11-09");
    expect(weeklyQuestsFor("2026-11-09")).toEqual(weeklyQuestsFor("2026-11-09"));
    expect(new Set(weeklyQuestsFor("2026-11-09").map((q) => q.id)).size).toBe(3);
  });
  it("現実の経験で達成し、報酬は1回。4週続くと称号", () => {
    const ws = "2026-11-09"; const qs = weeklyQuestsFor(ws);
    const evs = [ev("2026-11-10", "challenge", "あ".repeat(31)), ev("2026-11-11", "relationship", "い".repeat(31)), ev("2026-11-12", "learning"), ev("2026-11-13", "sports"), ev("2026-11-08", "learning")];
    const met = qs.find((q) => weeklyProgress(q, evs, ws).met)!;
    expect(met).toBeTruthy();
    let ch = createCharacter("げんた", "t");
    ch = { ...ch, world: { ...ch.world, quests: ["w:2026-11-02:x", "w:2026-10-26:x", "w:2026-10-19:x"] } };
    const r = claimWeekly(ch, evs, ws, met.id, "t", id);
    expect(r.character.experience).toBe(20);
    expect(weeklyStreak(r.character, ws)).toBe(4);
    expect(r.character.titles.map((t) => t.name)).toContain("続ける魔法使い");
    expect(() => claimWeekly(r.character, evs, ws, met.id, "t", id)).toThrow();
  });
});
