import { describe, expect, it } from "vitest";
import { NPCS } from "./npc";
import { MATERIALS } from "./explore";
import { canReceive, episodesOf, gift, lessonTrustMult, receive, talk, trustOf } from "./npcEngine";
import { lessonGain } from "./engine";
import { createCharacter } from "../character/create";
import type { Character } from "../../schemas";

const base = () => createCharacter("げんた", "t");
const withTrust = (ch: Character, id: string, bond: number): Character => ({ ...ch, relationships: [{ id, name: id, bond }] });

describe("学院の人たちの中身", () => {
  it("10人、各4話題で響く答えが1つ、好きな贈り物は素材にある", () => {
    expect(NPCS).toHaveLength(10);
    for (const n of NPCS) {
      expect(n.topics).toHaveLength(4);
      n.topics.forEach((t) => expect(t.choices.filter((c) => c.hit)).toHaveLength(1));
      expect(MATERIALS.some((m) => m.id === n.gift)).toBe(true);
      expect(n.chats.length).toBeGreaterThan(0); expect(n.episodes).toHaveLength(2);
      if (n.kind === "teacher") expect(n.course).toBeTruthy();
    }
  });
});

describe("交流", () => {
  it("1回目は話題つき(響く答えは多め)、2回目からはひとこと、5回まで。絆で伸びやすい", () => {
    const ch = base(); // 絆10 → ×1.1
    const hitIdx = NPCS[0].topics[0].choices.findIndex((c) => c.hit);
    const r1 = talk(ch, "leon", hitIdx, 0, "t");
    expect(r1.gain).toBe(Math.round(8 * 1.1)); expect(r1.character.world.npcTopics.leon).toBe(1);
    expect(r1.character.world.answers).toEqual([`leon:0:${hitIdx}`]);
    const miss = talk(ch, "leon", (hitIdx + 1) % 3, 0, "t");
    expect(miss.gain).toBe(Math.round(4 * 1.1));
    const r2 = talk(r1.character, "leon", null, 1, "t");
    expect(r2.kind).toBe("chat"); expect(r2.gain).toBe(1);
    expect(() => talk(r1.character, "leon", null, 5, "t")).toThrow();
    expect(() => talk(ch, "leon", 3, 0, "t")).toThrow(); // 共鳴の声が必要
    const strong: Character = { ...ch, basicStats: { ...ch.basicStats, bond: 50 }, learnedSpells: ["mind-2"] };
    expect(talk(strong, "leon", 3, 0, "t").gain).toBe(15);
    expect(talk(ch, "leon", hitIdx, 0, "t").character.basicStats).toEqual(ch.basicStats);
  });
  it("信頼20で昔話、70で称号、100で止まる", () => {
    let ch = withTrust(base(), "noe", 15);
    const r = talk(ch, "noe", 0, 0, "t");
    expect(r.episodes).toEqual([0]); expect(episodesOf(r.character, "noe")).toHaveLength(1);
    ch = withTrust(base(), "noe", 65);
    const r70 = talk(ch, "noe", 0, 0, "t");
    expect(r70.titled).toBe(true); expect(r70.character.titles.map((x) => x.name)).toContain("温室の友");
    expect(trustOf(talk(withTrust(base(), "noe", 99), "noe", 0, 0, "t").character, "noe")).toBe(100);
  });
  it("贈り物は好物で多め・1日1回、仲間のお裾分けは信頼40から", () => {
    const ch: Character = { ...base(), inventory: [{ id: "glowmoss", name: "光る苔", qty: 1 }, { id: "stardust", name: "星砂", qty: 1 }] };
    const g = gift(ch, "noe", "glowmoss", false, "t");
    expect(g.liked).toBe(true); expect(g.gain).toBe(11); expect(g.character.inventory.map((i) => i.id)).toEqual(["stardust"]);
    expect(() => gift(ch, "noe", "glowmoss", true, "t")).toThrow();
    expect(canReceive(ch, "noe")).toBe(false);
    const r = receive(withTrust(ch, "noe", 40), "noe", false, "t");
    expect(r.character.inventory.find((i) => i.id === "glowmoss")?.qty).toBe(2);
    expect(canReceive(withTrust(ch, "t-nature", 90), "t-nature")).toBe(false);
  });
  it("先生の信頼40で、その講座の熟練度が1.2倍", () => {
    const ch = base();
    expect(lessonTrustMult(withTrust(ch, "t-elemental", 40), "elemental")).toBe(1.2);
    expect(lessonGain(withTrust(ch, "t-elemental", 40), "elemental", 0, true).prof).toBe(18);
    expect(lessonGain(ch, "elemental", 0, true).prof).toBe(15);
  });
});
