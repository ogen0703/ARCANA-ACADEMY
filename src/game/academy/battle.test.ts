import { describe, expect, it } from "vitest";
import { applyBattle, ctxOf, maxes, rankOf, replay, startBattle, step, unlocked, type Command } from "./battle";
import { createCharacter } from "../character/create";
import type { Character } from "../../schemas";

let n = 0; const id = () => "b" + n++;
const staffUntilEnd = (ch: Character, opp: string, extra: (i: number) => Command = () => ({ type: "staff" })) => {
  const c = ctxOf(ch); let s = startBattle(c, opp, 42); const cmds: Command[] = [];
  for (let i = 0; !s.over && i < 20; i++) { const cmd = extra(i); cmds.push(cmd); s = step(s, c, cmd); }
  return { s, cmds };
};

describe("戦闘のルール", () => {
  it("体力・魔力・精神力は現実の能力値から決まる", () => {
    const ch = createCharacter("げんた", "t");
    expect(maxes(ctxOf(ch))).toEqual({ hp: 40 + ch.basicStats.physical, mp: Math.round(20 + (ch.basicStats.intellect + ch.basicStats.creativity) / 2), sp: 20 + ch.basicStats.spirit });
  });
  it("はじめの能力値でも、杖で打つだけで演習人形に勝てる", () => {
    const { s } = staffUntilEnd(createCharacter("げんた", "t"), "dummy");
    expect(s.over).toBe("win");
  });
  it("同じ種とコマンドなら同じ結果(再生で確かめられる)", () => {
    const ch = createCharacter("げんた", "t");
    const a = staffUntilEnd(ch, "shadow");
    const b = replay(ctxOf(ch), "shadow", 42, a.cmds);
    expect(b.over).toBe(a.s.over); expect(b.me).toEqual(a.s.me);
    expect(() => replay(ctxOf(ch), "shadow", 42, [...a.cmds, { type: "staff" }])).toThrow();
  });
  it("硬い殻は痛手半分、封印の鍵で解ける。覚えていない呪文は使えない", () => {
    const ch: Character = { ...createCharacter("げんた", "t"), learnedSpells: ["ancient-2"] };
    const c = ctxOf(ch);
    const s0 = startBattle(c, "golem", 1);
    const hitShell = step(s0, c, { type: "staff" });
    const unsealed = step(step(s0, c, { type: "spell", id: "ancient-2" }), c, { type: "staff" });
    expect(s0.foe.hp - hitShell.foe.hp).toBeLessThan(unsealed.foe.max - (unsealed.foe.hp));
    expect(() => step(s0, c, { type: "spell", id: "elemental-1" })).toThrow();
  });
  it("挑める順番とランク", () => {
    expect(unlocked([], "dummy")).toBe(true);
    expect(unlocked([], "wisp")).toBe(false);
    expect(unlocked(["dummy", "wisp", "shadow", "golem"], "teacher")).toBe(false);
    expect(rankOf(["dummy", "wisp", "shadow"]).name).toBe("銅の徽章");
    expect(rankOf(["dummy", "wisp", "shadow", "golem", "echo"]).name).toBe("銀の徽章");
  });
});

describe("結果の反映", () => {
  it("勝つとEXP・素材・初勝利の称号。4勝目からは報酬なし。能力値は変わらない", () => {
    const ch = createCharacter("げんた", "t");
    const { cmds } = staffUntilEnd(ch, "dummy");
    const r = applyBattle(ch, { id: id(), opp: "dummy", seed: 42, cmds, rewardedToday: 0 }, "t", id);
    expect(r.rewarded).toBe(true); expect(r.exp).toBe(5); expect(r.items.stardust).toBeGreaterThanOrEqual(1);
    expect(r.titles).toContain("演習場の新人"); expect(r.character.world.defeated).toEqual(["dummy"]);
    expect(r.character.basicStats).toEqual(ch.basicStats);
    const r4 = applyBattle(r.character, { id: id(), opp: "dummy", seed: 42, cmds, rewardedToday: 3 }, "t", id);
    expect(r4.rewarded).toBe(false); expect(r4.exp).toBe(0);
    expect(() => applyBattle(ch, { id: id(), opp: "wisp", seed: 1, cmds: [{ type: "retreat" }], rewardedToday: 0 }, "t", id)).toThrow();
  });
});
