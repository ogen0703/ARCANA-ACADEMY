import { describe, expect, it } from "vitest";
import { meetSevenstar, nextScene, outfitsOf, readScene, routeTask, type StoryCtx } from "./engine";
import { CHAPTER1 } from "./chapter1";
import { createCharacter } from "../character/create";
import { ctxOf, startBattle, step, unlocked, storyOpen } from "../academy/battle";
import { realBoost, companionCanPass } from "../academy/creaturesEngine";
import type { Character } from "../../schemas";

let n = 0; const id = () => "s" + n++;
const ctx = (o: Partial<StoryCtx> = {}): StoryCtx => ({ today: "2026-11-01", talkedMilo: true, realDays: 20, nightVisits: 0, ...o });
const day = (i: number) => `2026-11-${String(i).padStart(2, "0")}`;
function ready(): Character {
  const ch = createCharacter("げんた", "t");
  return { ...ch, diagnosedAt: "t", history: { ...ch.history, house: "暁火の寮" }, learnedSpells: ["ancient-2", "astral-1"], world: { ...ch.world, discoveries: ["d-ceiling", "d-diary", "d-chain", "d-altar"] } };
}
function upTo5(route: string) {
  let ch = ready();
  const picks: Record<number, string | null> = { 1: null, 2: "together", 3: "self", 4: null, 5: route, 6: null };
  for (let i = 1; i <= 6; i++) ch = readScene(ch, { id: id(), choice: picks[i] }, ctx({ today: day(i) }), "t", id).character;
  return ch;
}

describe("第1章「七つ目の星」", () => {
  it("8場面、場面2・3・5に3つの選択肢", () => {
    expect(CHAPTER1).toHaveLength(8);
    expect(CHAPTER1.filter((s) => s.choices?.length === 3).map((s) => s.no)).toEqual([2, 3, 5]);
  });
  it("1日1場面・条件がそろわないとひらかない・選択は物語の中だけ", () => {
    const ch = ready();
    expect(nextScene(createCharacter("g", "t"), ctx()).open).toBe(false);
    const r = readScene(ch, { id: id(), choice: null }, ctx(), "t", id);
    expect(r.character.experience).toBe(5);
    expect(() => readScene(r.character, { id: id(), choice: "together" }, ctx(), "t", id)).toThrow("1日1場面");
    const r2 = readScene(r.character, { id: id(), choice: "together" }, ctx({ today: "2026-11-02" }), "t", id);
    expect(r2.character.relationships.find((x) => x.id === "milo")?.bond).toBe(5);
    expect(r2.character.basicStats).toEqual(ch.basicStats); expect(r2.character.personality).toEqual(ch.personality);
    expect(nextScene(r2.character, ctx({ today: "2026-11-03", realDays: 0 })).open).toBe(true);
  });
  it("場面6は現実の経験10日、場面5で道が決まる", () => {
    let ch = ready();
    for (let i = 1; i <= 5; i++) ch = readScene(ch, { id: id(), choice: ({ 2: "alone", 3: "wait", 5: "B" } as Record<number, string>)[i] ?? null }, ctx({ today: day(i) }), "t", id).character;
    expect(ch.world.story.route).toBe("B");
    expect(nextScene(ch, ctx({ today: day(6), realDays: 9 })).open).toBe(false);
    expect(nextScene(ch, ctx({ today: day(6), realDays: 10 })).open).toBe(true);
  });
  it("道ごとの課題(A:星影に勝つ・B:夜の保護区3回・C:信頼)", () => {
    const a = upTo5("A");
    expect(storyOpen(a)).toBe(true); expect(unlocked(a.world.defeated, "starshade", storyOpen(a))).toBe(true);
    expect(unlocked([], "starshade")).toBe(false);
    expect(routeTask(a, ctx())[0].met).toBe(false);
    expect(routeTask({ ...a, world: { ...a.world, defeated: ["starshade"] } }, ctx())[0].met).toBe(true);
    const b = upTo5("B"); expect(routeTask(b, ctx({ nightVisits: 3 }))[0].met).toBe(true);
    const c = upTo5("C"); const rel = ["t-astral", "t-mind", "leon", "noe"].map((x) => ({ id: x, name: x, bond: 40 }));
    expect(routeTask({ ...c, relationships: rel }, ctx()).every((x) => x.met)).toBe(true);
  });
  it("場面7で七つ星の仔と心を通わせ、場面8で第1章完(称号・衣装)", () => {
    let ch = upTo5("B");
    const c7 = ctx({ today: day(7), nightVisits: 3 });
    const fail = meetSevenstar(ch, { id: id(), actions: ["run"] }, c7, "t", id);
    expect(fail.friend).toBe(false);
    const ok = meetSevenstar(ch, { id: id(), actions: ["wait", "call", "make"] }, c7, "t", id);
    expect(ok.friend).toBe(true); ch = ok.character;
    expect(ch.world.companion).toBe("sevenstar");
    const end = readScene(ch, { id: id(), choice: null }, ctx({ today: day(8) }), "t", id);
    expect(end.cleared).toBe(true); expect(end.character.titles.map((t) => t.name)).toContain("星を見守る者");
    expect(outfitsOf(end.character).find((o) => o.id === "starheir")?.ok).toBe(true);
  });
  it("七つ星の仔:現実の経験で+3(1日最大+9)・探索はどこでも・成体で覚醒", () => {
    const base = ready();
    let ch: Character = { ...base, world: { ...base.world, companion: "sevenstar", creatures: { sevenstar: { friend: true, attempts: 1, affection: 37 } } } };
    for (let i = 0; i < 4; i++) ch = realBoost(ch, "2026-11-01", "t");
    expect(ch.world.creatures.sevenstar.affection).toBe(46);
    expect(companionCanPass(ch, "a5")).toBe(true);
    const adult = { ...ch, world: { ...ch.world, creatures: { sevenstar: { friend: true, attempts: 1, affection: 80 } } } };
    const c = ctxOf(adult); expect(c.awaken).toBe(true);
    let s = step(startBattle(c, "dummy", 1), c, { type: "awaken" });
    expect(s.awaken).toBe(3); expect(() => step(s, c, { type: "awaken" })).toThrow();
    s = step(s, c, { type: "companion" }); expect(s.log.join("")).toContain("星の加護");
  });
});
