import { describe, expect, it } from "vitest";
import { nextScene3, outfitsOf, readScene3, seventhLit, starBound, type StoryCtx } from "./engine";
import { CHAPTER3, ROUTES3 } from "./chapter3";
import { createCharacter } from "../character/create";
import { canEnter, applyExploration } from "../academy/exploreEngine";
import { PLACES } from "../academy/explore";
import { OPPONENTS, ctxOf, startBattle, step, storyOpen } from "../academy/battle";
import type { Character } from "../../schemas";

let n = 0; const id = () => "d" + n++;
const ctx = (o: Partial<StoryCtx> = {}): StoryCtx => ({ today: "2027-01-01", talkedMilo: true, realDays: 60, nightVisits: 0, skypathCleared: true, ...o });
const day = (i: number) => `2027-01-${String(i).padStart(2, "0")}`;
const sky = PLACES.find((p) => p.id === "skypath")!;
function cleared2(): Character {
  const ch = createCharacter("げんた", "t");
  return {
    ...ch, diagnosedAt: "t", relationships: [{ id: "t-astral", name: "セレスティン", bond: 50 }],
    world: { ...ch.world, story: { ...ch.world.story, scene: 8, cleared: true, route: "A" }, story2: { ...ch.world.story2, scene: 8, cleared: true, route: "A", log: [{ scene: 8, date: "2026-12-31", choice: null }] }, companion: "sevenstar", creatures: { ...ch.world.creatures, sevenstar: { met: 1, friend: true, affection: 80, stage: 2, fed: "", lastVisit: "" } as never } },
  };
}
const read = (ch: Character, i: number, choice: string | null = null, o: Partial<StoryCtx> = {}) => readScene3(ch, { id: id(), choice }, ctx({ today: day(i), ...o }), "t", id).character;
const upTo5 = (route: string) => { let ch = { ...cleared2(), world: { ...cleared2().world, discoveries: ["d-shadowmemory"] } } as Character; for (const [i, c] of [[1, null], [2, "guard"], [3, null], [4, null], [5, route]] as [number, string | null][]) ch = read(ch, i, c); return ch; };

describe("第3章「星を還す夜」", () => {
  it("8場面、場面2・5に3つの選択肢、3つの道と称号", () => {
    expect(CHAPTER3).toHaveLength(8);
    expect(CHAPTER3.filter((s) => s.choices?.length === 3).map((s) => s.no)).toEqual([2, 5]);
    expect(Object.values(ROUTES3).map((r) => r.title)).toEqual(["星を還す者", "光と影を結ぶ者", "星をつくる者"]);
  });
  it("第2章を読み終えた次の日・教授の信頼50・通算40日で回廊がひらく", () => {
    expect(nextScene3(cleared2(), ctx({ today: "2026-12-31" })).open).toBe(false);
    let ch = read(cleared2(), 1);
    expect(nextScene3({ ...ch, relationships: [] }, ctx({ today: day(2) })).open).toBe(false);
    ch = read(ch, 2, "guard");
    expect(ch.world.creatures.sevenstar!.affection).toBe(85);
    expect(canEnter(ch, sky).ok).toBe(false);
    expect(nextScene3(ch, ctx({ today: day(3), realDays: 39 })).open).toBe(false);
    ch = read(ch, 3);
    expect(canEnter(ch, sky).ok).toBe(true);
    const r = applyExploration({ ...ch, learnedSpells: ["astral-1", "astral-2", "mind-2", "mind-3"] }, { id: id(), place: "skypath", steps: [{ room: "k1", method: "spell:astral-1" }, { room: "k2", method: "skip" }], todayCount: 0 }, "t", id);
    expect(r.items.stardust).toBe(1);
  });
  it("道ごとの課題と星喰い(覚醒2回・鎮める)", () => {
    const a = upTo5("A");
    expect(a.world.story3.route).toBe("A");
    expect(nextScene3(a, ctx({ today: day(6) })).open).toBe(false);
    expect(nextScene3({ ...a, learnedSpells: ["astral-3"] }, ctx({ today: day(6), skypathCleared: false })).open).toBe(false);
    expect(nextScene3({ ...a, learnedSpells: ["astral-3"] }, ctx({ today: day(6) })).open).toBe(true);
    const b = upTo5("B");
    expect(nextScene3(b, ctx({ today: day(6) })).open).toBe(false); // なつき85
    const b90 = { ...b, world: { ...b.world, creatures: { ...b.world.creatures, sevenstar: { ...b.world.creatures.sevenstar!, affection: 90 } } } };
    expect(nextScene3(b90, ctx({ today: day(6) })).open).toBe(true);
    const c = upTo5("C"); const rel = ["t-astral", "t-mind", "t-ancient", "leon", "noe", "iris"].map((x) => ({ id: x, name: x, bond: 60 }));
    expect(nextScene3({ ...c, relationships: rel }, ctx({ today: day(6) })).open).toBe(true);
    // 星喰い
    const after6 = read(b90, 6);
    expect(storyOpen(after6, "starshadow")).toBe(true); expect(storyOpen(b90, "starshadow")).toBe(false);
    const cx = ctxOf(after6); expect(cx.awaken).toBe(true);
    expect(OPPONENTS.find((o) => o.id === "starshadow")!.calm).toBe(true);
    let st = startBattle(cx, "starshadow", 1);
    st = step(st, cx, { type: "awaken" }); expect(() => step({ ...st, stunned: false }, cx, { type: "awaken" })).toThrow("覚醒している");
    st = { ...st, awaken: 0, stunned: false };
    st = step(st, cx, { type: "awaken" }); expect(st.awakenTimes).toBe(2); expect(st.awakenUsed).toBe(true);
    expect(() => step({ ...st, awaken: 0, stunned: false }, cx, { type: "awaken" })).toThrow("2回");
  });
  it("場面8で第一部完:称号・夜空の装い・七つ目の角、道Bは仔が結ばれた姿", () => {
    let b = upTo5("B");
    b = { ...b, world: { ...b.world, creatures: { ...b.world.creatures, sevenstar: { ...b.world.creatures.sevenstar!, affection: 90 } } } };
    b = read(b, 6); b = read({ ...b, world: { ...b.world, defeated: ["starshadow"] } }, 7);
    expect(nextScene3(b, ctx({ today: day(8), realDays: 49 })).open).toBe(false);
    b = read(b, 8);
    expect(b.world.story3.cleared).toBe(true);
    expect(b.titles.map((t) => t.name)).toContain("光と影を結ぶ者");
    expect(starBound(b)).toBe(true); expect(seventhLit(b)).toBe(true);
    expect(outfitsOf(b).find((o) => o.id === "nightsky")!.ok).toBe(true);
    expect(b.basicStats).toEqual(cleared2().basicStats); expect(b.personality).toEqual(cleared2().personality);
    expect(() => read(b, 9)).toThrow();
  });
});
