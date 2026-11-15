import { describe, expect, it } from "vitest";
import { CREATURES } from "./creatures";
import { MATERIALS, PLACES } from "./explore";
import { approachValue, available, companionCanPass, companionSupport, encounter, feed, play, realBoost, startDistance, visit } from "./creaturesEngine";
import { applyExploration } from "./exploreEngine";
import { ctxOf, startBattle, step } from "./battle";
import { createCharacter } from "../character/create";
import type { Character } from "../../schemas";

const friendOf = (ch: Character, id: string, affection = 0): Character => ({ ...ch, world: { ...ch.world, creatures: { [id]: { friend: true, attempts: 1, affection } }, companion: id } });

describe("魔法生物の中身", () => {
  it("7種、好物は素材、探索の部屋は実在する", () => {
    expect(CREATURES).toHaveLength(7);
    const rooms = PLACES.flatMap((p) => p.rooms.map((r) => r.id));
    for (const c of CREATURES) { expect(MATERIALS.some((m) => m.id === c.favorite)).toBe(true); c.explore.rooms.forEach((r) => expect(rooms).toContain(r)); }
  });
  it("時間帯と天候で出会える生物が変わる", () => {
    expect(available("night", "clear").map((c) => c.id)).toEqual(["starfox", "dreamowl", "salamander"]);
    expect(available("day", "mist").map((c) => c.id)).toContain("stoneward");
    expect(available("day", "clear").map((c) => c.id)).not.toContain("windjelly");
    expect(available("day", "clear").map((c) => c.id)).toContain(encounter(createCharacter("g", "t"), "day", "clear", 123).id);
  });
});

describe("出会いと仲間", () => {
  it("好む近づき方で心の距離が縮まり、仲間になる。好物は使う", () => {
    const ch: Character = { ...createCharacter("g", "t"), inventory: [{ id: "glowmoss", name: "光る苔", qty: 1 }] };
    expect(startDistance(ch, CREATURES[3])).toBe(10);
    const r = visit(ch, { creature: "mossdeer", actions: ["wait", "offer", "wait"], visitsToday: 0 }, "t");
    expect(r.friend).toBe(true); expect(r.character.inventory).toEqual([]);
    expect(r.character.world.companion).toBe("mossdeer");
    expect(r.character.titles.map((t) => t.name)).toContain("生き物と心を通わせる者");
    expect(r.character.basicStats).toEqual(ch.basicStats);
  });
  it("合わない近づき方だと仲間にならず、次は少し近い。1日3回まで", () => {
    const ch = createCharacter("g", "t");
    const r = visit(ch, { creature: "mossdeer", actions: ["run", "call", "make"], visitsToday: 0 }, "t");
    expect(r.friend).toBe(false); expect(startDistance(r.character, CREATURES[3])).toBe(9);
    expect(approachValue(CREATURES[3], "wait", ["wait"])).toBe(2);
    expect(() => visit(ch, { creature: "mossdeer", actions: ["wait"], visitsToday: 3 }, "t")).toThrow();
    expect(() => visit(ch, { creature: "stoneward", actions: ["ancient"], visitsToday: 0 }, "t")).toThrow(); // 古文字の解読が必要
  });
});

describe("相棒", () => {
  it("世話で育ち、現実の経験でも1日+6まで育つ", () => {
    let ch: Character = { ...friendOf(createCharacter("g", "t"), "starfox", 35), inventory: [{ id: "stardust", name: "星砂", qty: 1 }] };
    const f = feed(ch, "starfox", false, "t"); expect(f.after).toBe(43); expect(f.grew).toBe(true);
    expect(() => feed(f.character, "starfox", true, "t")).toThrow();
    expect(play(f.character, "starfox", 1, "t").after).toBe(46);
    expect(() => play(f.character, "starfox", 2, "t")).toThrow();
    ch = f.character;
    for (let i = 0; i < 5; i++) ch = realBoost(ch, "2026-11-15", "t");
    expect(ch.world.creatures.starfox.affection).toBe(49);
    expect(realBoost(ch, "2026-11-16", "t").world.creatures.starfox.affection).toBe(51);
  });
  it("戦闘で1回手助け。成体は1.5倍", () => {
    const ch = friendOf(createCharacter("g", "t"), "mossdeer", 85);
    expect(companionSupport(ch)?.mult).toBe(1.5);
    const c = ctxOf(ch);
    let s = startBattle(c, "dummy", 1); s = step(s, c, { type: "staff" });
    const hp = s.me.hp; s = step(s, c, { type: "companion" });
    expect(s.me.hp).toBeGreaterThan(hp - 6);
    expect(() => step(s, c, { type: "companion" })).toThrow();
  });
  it("若体から探索で手伝ってくれる(発見も得られる)", () => {
    const young = friendOf(createCharacter("g", "t"), "stoneward", 40);
    expect(companionCanPass(young, "t3")).toBe(true);
    expect(companionCanPass(friendOf(createCharacter("g", "t"), "stoneward", 39), "t3")).toBe(false);
    const r = applyExploration(young, { id: "x", place: "temple", steps: [{ room: "t1", method: "alt:0" }, { room: "t2", method: "alt:0" }, { room: "t3", method: "companion:stoneward" }], todayCount: 0 }, "t", () => "h");
    expect(r.discoveries).toEqual(["d-stele"]);
  });
});
