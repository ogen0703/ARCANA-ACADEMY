import { describe, expect, it } from "vitest";
import { COMPOUNDS, research, stepsFor } from "./compound";
import { SPELLS } from "./content";
import { SPELL_FX, ctxOf, startBattle, step } from "./battle";
import { canMakeWand } from "./exploreEngine";
import { createCharacter } from "../character/create";
import { MAGIC_KEYS, type Character } from "../../schemas";

let n = 0; const id = () => "r" + n++;
function mage(over: Partial<Character> = {}): Character {
  const ch = createCharacter("げんた", "t");
  const aff = Object.fromEntries(MAGIC_KEYS.map((k) => [k, { ...ch.magicAffinity[k], value: 50 }])) as Character["magicAffinity"];
  return { ...ch, learnedSpells: SPELLS.filter((s) => s.tier !== "advanced").map((s) => s.id), magicAffinity: aff, history: { ...ch.history, house: "暁火の寮" }, ...over };
}

describe("複合魔法(Phase 5b)", () => {
  it("9種、組み合わせは違う系統の初級・中級の呪文", () => {
    expect(COMPOUNDS).toHaveLength(9);
    for (const c of COMPOUNDS) { const a = SPELLS.find((s) => s.id === c.a)!, b = SPELLS.find((s) => s.id === c.b)!; expect(a.system).not.toBe(b.system); expect(a.tier).not.toBe("advanced"); }
  });
  it("3回の研究で覚える。自分の寮の秘術は2回。熟練度が+3ずつ", () => {
    let ch = mage();
    const meteor = COMPOUNDS.find((c) => c.id === "c-meteor")!, net = COMPOUNDS.find((c) => c.id === "c-stormnet")!;
    expect(stepsFor(ch, meteor)).toBe(3); expect(stepsFor(ch, net)).toBe(2);
    let r = research(ch, { id: id(), a: "elemental-2", b: "creation-2", todayCount: 0 }, "t", id);
    expect(r.result.kind).toBe("progress"); expect(r.result.prof.elemental).toBe(3);
    ch = r.character;
    r = research(ch, { id: id(), a: "creation-2", b: "elemental-2", todayCount: 0 }, "t", id);
    expect(r.result.kind).toBe("learned"); expect(r.character.world.compounds).toContain("c-stormnet");
    expect(r.history[0].kind).toBe("compound");
    expect(r.character.basicStats).toEqual(ch.basicStats);
  });
  it("1日1回・同じ系統はだめ・はずれはヒント・適性35未満は進まない", () => {
    const ch = mage();
    expect(() => research(ch, { id: id(), a: "elemental-1", b: "ancient-1", todayCount: 1 }, "t", id)).toThrow();
    expect(() => research(ch, { id: id(), a: "elemental-1", b: "elemental-2", todayCount: 0 }, "t", id)).toThrow();
    const miss = research(ch, { id: id(), a: "elemental-1", b: "nature-2", todayCount: 0 }, "t", id);
    expect(miss.result.kind).toBe("miss"); expect(miss.result.hint).toContain("響き合い");
    const low = { ...ch, magicAffinity: { ...ch.magicAffinity, ancient: { ...ch.magicAffinity.ancient, value: 20 } } };
    const weak = research(low, { id: id(), a: "elemental-1", b: "ancient-1", todayCount: 0 }, "t", id);
    expect(weak.result.kind).toBe("weak"); expect(weak.character.world.research["c-flamescript"] ?? 0).toBe(0);
  });
  it("戦闘で使える(流星の矢は硬い殻を貫く)", () => {
    const ch = { ...mage(), world: { ...mage().world, compounds: ["c-meteor"] } };
    const c = ctxOf(ch); expect(c.spells).toContain("c-meteor"); expect(SPELL_FX["elemental-3"]).toBeTruthy();
    const s = step(startBattle(c, "golem", 1), c, { type: "spell", id: "c-meteor" });
    expect(s.log.join("")).toContain("貫いた");
  });
  it("若木の細工があれば星の欠片なしで杖を作れる", () => {
    const ch = { ...mage(), diagnosedAt: "t" };
    expect(canMakeWand(ch).ok).toBe(false);
    expect(canMakeWand({ ...ch, world: { ...ch.world, compounds: ["c-sapling"] } }).ok).toBe(true);
  });
});
