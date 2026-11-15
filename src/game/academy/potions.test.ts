import { describe, expect, it } from "vitest";
import { POTIONS, brew, flowerbed, potionCount, walkGarden, potionItemId } from "./potions";
import { MATERIALS } from "./explore";
import { createCharacter } from "../character/create";
import { ctxOf, maxes, startBattle, step, applyBattle } from "./battle";
import { applyExploration, roomOptions } from "./exploreEngine";
import { approachOptions, visit } from "./creaturesEngine";
import { creatureById } from "./creatures";
import { todayLocal } from "../../utils/id";
import type { Character } from "../../schemas";

let n = 0; const id = () => "p" + n++;
const inv = (items: Record<string, number>) => Object.entries(items).map(([k, q]) => ({ id: k, name: k, qty: q }));
function cook(over: Partial<Character> = {}): Character {
  const ch = createCharacter("げんた", "t");
  return { ...ch, academy: { proficiency: { nature: 40, creation: 40 }, units: { nature: [1, 1, 1, 1], creation: [1, 1, 1, 1] } }, inventory: inv({ sunherb: 3, glowmoss: 3, moonherb: 3, stardust: 3, candlestand: 2, oldpaper: 2, violetink: 2 }), ...over };
}

describe("魔法薬(Phase 6a)", () => {
  it("8種、材料はすべて素材の一覧にある(星の欠片・紋章・写本は使わない)", () => {
    expect(POTIONS).toHaveLength(8);
    for (const p of POTIONS) for (const m of p.mats) { expect(MATERIALS.some((x) => x.id === m)).toBe(true); expect(["starshard", "staremblem", "oldcodex"]).not.toContain(m); }
  });
  it("調合:材料を使い、熟練度+2、1日2回、5個まで、上質は熟練度の合計100から", () => {
    const ch = cook();
    const r = brew(ch, "heal", 0, "t");
    expect(potionCount(r.character.inventory, "heal")).toBe(1); expect(r.fine).toBe(false);
    expect(r.character.academy.proficiency.nature).toBe(42);
    expect(r.character.basicStats).toEqual(ch.basicStats);
    expect(() => brew(ch, "heal", 2, "t")).toThrow("2回");
    expect(() => brew(createCharacter("g", "t"), "heal", 0, "t")).toThrow("調合法");
    const full = { ...ch, inventory: [...ch.inventory, { id: potionItemId("heal", false), name: "x", qty: 5 }] };
    expect(() => brew(full, "heal", 0, "t")).toThrow("5個");
    expect(brew({ ...ch, academy: { ...ch.academy, proficiency: { nature: 50, creation: 50 } } }, "heal", 0, "t").fine).toBe(true);
  });
  it("戦闘:1戦1回飲める・上質は1.5倍・勝敗が決まると持ち物から減る", () => {
    const ch = cook({ inventory: inv({ [potionItemId("heal", true)]: 1 }) });
    const c = ctxOf(ch); expect(c.potions?.heal?.fine).toBe(true);
    let s = startBattle(c, "dummy", 1); s = { ...s, me: { ...s.me, hp: 10 } };
    s = step(s, c, { type: "potion", id: "heal" }); expect(s.log.join("")).toContain("体力+38");
    expect(() => step(s, c, { type: "potion", id: "heal" })).toThrow("1戦に1回");
    const r = applyBattle(ch, { id: id(), opp: "dummy", seed: 1, cmds: [{ type: "potion", id: "heal" }, { type: "retreat" }], rewardedToday: 0 }, "t", id);
    expect(potionCount(r.character.inventory, "heal")).toBe(0);
  });
  it("探索:灯りの香油で暗い回廊を通れる / 保護区:練り餌と安らぎの香", () => {
    const ch = cook({ inventory: inv({ [potionItemId("lamp", false)]: 1, [potionItemId("bait", false)]: 1, [potionItemId("calm", false)]: 1 }) });
    expect(roomOptions(ch, "temple", 1).potions[0].method).toBe("potion:lamp");
    const r = applyExploration(ch, { id: id(), place: "temple", steps: [{ room: "t1", method: "alt:0" }, { room: "t2", method: "potion:lamp" }], todayCount: 0 }, "t", id);
    expect(potionCount(r.character.inventory, "lamp")).toBe(0); expect(r.items.candlestand).toBe(1);
    const fox = creatureById("starfox")!;
    expect(approachOptions(ch, fox).map((o) => o.action)).toEqual(expect.arrayContaining(["potion:bait", "potion:calm"]));
    const v = visit(ch, { creature: "starfox", actions: ["potion:calm", "potion:bait", "call", "run"], visitsToday: 0 }, "t");
    expect(potionCount(v.character.inventory, "calm") + potionCount(v.character.inventory, "bait")).toBe(0);
  });
});

describe("星影の庭園(Phase 6a)", () => {
  it("花壇:承認した日ごとに1輪、その日いちばん多い種類", () => {
    const e = (date: string, category: string, st = "applied") => ({ date, category, title: date + category, analysisStatus: st }) as never;
    const b = flowerbed([e("2026-11-01", "sports"), e("2026-11-01", "learning"), e("2026-11-01", "learning"), e("2026-11-03", "music"), e("2026-11-04", "work", "proposed"), e("2026-10-30", "work")], "2026-11");
    expect(b.map((x) => [x.date, x.category])).toEqual([["2026-11-01", "learning"], ["2026-11-03", "music"]]);
  });
  it("庭を歩く:1日1回、薬草(花7輪で2つ)、相棒+2、その日の演習は最大値+10%", () => {
    const base = createCharacter("げんた", "t");
    const ch = { ...base, world: { ...base.world, companion: "starfox", creatures: { starfox: { friend: true, attempts: 1, affection: 10 } } } };
    const today = todayLocal();
    const r = walkGarden(ch, { today, daytime: false, bloomsThisMonth: 7 }, "t");
    expect(r.character.inventory.find((i) => i.id === "moonherb")?.qty).toBe(2);
    expect(r.character.world.creatures.starfox.affection).toBe(12);
    expect(() => walkGarden(r.character, { today, daytime: true, bloomsThisMonth: 0 }, "t")).toThrow("もう");
    expect(maxes(ctxOf(r.character)).hp).toBe(Math.round(maxes(ctxOf(ch)).hp * 1.1));
  });
});
