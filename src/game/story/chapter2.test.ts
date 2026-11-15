import { describe, expect, it } from "vitest";
import { nextScene2, readScene2, type StoryCtx } from "./engine";
import { CHAPTER2, ROUTES2 } from "./chapter2";
import { createCharacter } from "../character/create";
import { canEnter, applyExploration } from "../academy/exploreEngine";
import { PLACES } from "../academy/explore";
import { storyOpen, unlocked } from "../academy/battle";
import type { Character } from "../../schemas";

let n = 0; const id = () => "c" + n++;
const ctx = (o: Partial<StoryCtx> = {}): StoryCtx => ({ today: "2026-12-01", talkedMilo: true, realDays: 40, nightVisits: 0, towerCleared: true, bloomsThisMonth: 10, ...o });
const day = (i: number) => `2026-12-${String(i).padStart(2, "0")}`;
const tower = PLACES.find((p) => p.id === "tower")!;
function cleared1(): Character {
  const ch = createCharacter("げんた", "t");
  return {
    ...ch, diagnosedAt: "t",
    relationships: [{ id: "t-mind", name: "ミラ", bond: 40 }],
    inventory: [{ id: "staremblem", name: "古い星の紋章", qty: 1 }, { id: "oldcodex", name: "古い写本", qty: 1 }],
    world: { ...ch.world, story: { ...ch.world.story, scene: 8, cleared: true, route: "A", log: [{ scene: 8, date: "2026-11-30", choice: null }] }, creatures: { ...ch.world.creatures, sevenstar: { met: 1, friend: true, affection: 50, stage: 0, fed: "", lastVisit: "" } as never } },
  };
}
const read = (ch: Character, i: number, choice: string | null = null, o: Partial<StoryCtx> = {}) => readScene2(ch, { id: id(), choice }, ctx({ today: day(i), ...o }), "t", id).character;

describe("第2章「星を降ろした人」", () => {
  it("8場面、場面2・4に3つの選択肢、3つの道", () => {
    expect(CHAPTER2).toHaveLength(8);
    expect(CHAPTER2.filter((s) => s.choices?.length === 3).map((s) => s.no)).toEqual([2, 4]);
    expect(Object.keys(ROUTES2)).toEqual(["A", "B", "C"]);
  });
  it("第1章を読み終えた次の日からひらく", () => {
    expect(nextScene2(createCharacter("g", "t"), ctx()).open).toBe(false);
    expect(nextScene2(cleared1(), ctx({ today: "2026-11-30" })).open).toBe(false);
    expect(nextScene2(cleared1(), ctx()).open).toBe(true);
  });
  it("場面3で鍵の素材を使い、星の塔に入れる。場面4で道が決まる", () => {
    let ch = cleared1();
    expect(canEnter(ch, tower).ok).toBe(false);
    ch = read(ch, 1); ch = read(ch, 2, "peek");
    expect(ch.relationships.find((r) => r.id === "t-mind")!.bond).toBeGreaterThan(40);
    ch = read(ch, 3);
    expect(ch.inventory.find((i) => i.id === "staremblem")).toBeUndefined();
    expect(canEnter(ch, tower).ok).toBe(true);
    expect(nextScene2(ch, ctx({ today: day(4) })).open).toBe(false); // 日誌がまだ
    const r = applyExploration({ ...ch, learnedSpells: ["astral-1"] }, { id: id(), place: "tower", steps: [{ room: "w1", method: "alt:0" }, { room: "w2", method: "spell:astral-1" }], todayCount: 0 }, "t", id);
    expect(r.discoveries).toEqual(["d-logbook"]);
    ch = read(r.character, 4, "B");
    expect(ch.world.story2.route).toBe("B");
    expect(ch.basicStats).toEqual(cleared1().basicStats); expect(ch.personality).toEqual(cleared1().personality);
  });
  it("道ごとの課題と星喰いの影、場面8で称号となつき", () => {
    let ch = cleared1();
    ch = { ...ch, world: { ...ch.world, discoveries: ["d-logbook"] } };
    for (const [i, c] of [[1, null], [2, "later"], [3, null], [4, "B"], [5, null]] as [number, string | null][]) ch = read(ch, i, c);
    expect(nextScene2(ch, ctx({ today: day(6), bloomsThisMonth: 9 })).open).toBe(false);
    expect(nextScene2(ch, ctx({ today: day(6), towerCleared: false })).open).toBe(false);
    expect(storyOpen(ch, "starhunger")).toBe(false);
    ch = read(ch, 6);
    expect(storyOpen(ch, "starhunger")).toBe(true); expect(unlocked(ch.world.defeated, "starhunger", storyOpen(ch, "starhunger"))).toBe(true);
    expect(nextScene2(ch, ctx({ today: day(7) })).open).toBe(false);
    ch = read({ ...ch, world: { ...ch.world, defeated: ["starhunger"] } }, 7);
    expect(nextScene2(ch, ctx({ today: day(8), realDays: 29 })).open).toBe(false);
    ch = read(ch, 8);
    expect(ch.world.story2.cleared).toBe(true);
    expect(ch.titles.map((t) => t.name)).toContain("自分を生きる者");
    expect(ch.world.creatures.sevenstar!.affection).toBe(60);
    expect(() => read(ch, 9)).toThrow();
  });
});
