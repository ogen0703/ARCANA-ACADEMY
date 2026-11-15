/**
 * 魔法生物と相棒(世界設定書 Phase 5a でげんたが承認:https://claude.ai/artifact/XPzNTLRQs6Q5Y3oFguuSHD)。
 */
import type { MagicKey, PersonalityKey } from "../../schemas";
import type { TimeKey, WeatherKey } from "../world/ambience";

export type Approach = "wait" | "call" | "offer" | "run" | "make" | "ancient";
export const APPROACHES: { id: Approach; label: string; needs?: string }[] = [
  { id: "wait", label: "そっと待つ" },
  { id: "call", label: "静かに声をかける" },
  { id: "offer", label: "好物を差し出す" },
  { id: "run", label: "一緒に走る" },
  { id: "make", label: "何かを作って見せる" },
  { id: "ancient", label: "古代文字で話しかける", needs: "ancient-1" },
];

export type Creature = {
  id: string; name: string; system: MagicKey; desc: string; times: TimeKey[] | "any"; weather?: WeatherKey;
  likes: Approach; favorite: string; spells: string[]; personality: PersonalityKey;
  battle: { kind: "light" | "calm" | "shield" | "heal" | "attack" | "unseal" | "net"; label: string; power?: number };
  explore: { rooms: string[]; label: string };
  stages: [string, string, string];
};

export const CREATURES: Creature[] = [
  { id: "starfox", name: "星尾ギツネ", system: "astral", desc: "夜に尾が星座のように光る小さな狐", times: ["night"], likes: "wait", favorite: "stardust", spells: ["astral-1"], personality: "curiosity",
    battle: { kind: "light", label: "尾の光で弱点を照らす(次の攻撃1.5倍)" }, explore: { rooms: ["t2", "a4"], label: "尾の光で照らしてもらう" }, stages: ["仔ギツネ", "若ギツネ", "星尾の守り手"] },
  { id: "dreamowl", name: "夢見フクロウ", system: "mind", desc: "眠る人の夢を見守る、白い大きな目のフクロウ", times: ["dusk", "night"], likes: "call", favorite: "violetink", spells: ["mind-1"], personality: "empathy",
    battle: { kind: "calm", label: "精神力を整える(+12)", power: 12 }, explore: { rooms: ["a2"], label: "惑わせる声を遮ってもらう" }, stages: ["ひなフクロウ", "若フクロウ", "夢守りのフクロウ"] },
  { id: "gearlizard", name: "歯車トカゲ", system: "creation", desc: "真鍮の鱗を持ち、壊れた道具を集める", times: ["day"], likes: "make", favorite: "candlestand", spells: ["creation-1"], personality: "inquisitiveness",
    battle: { kind: "shield", label: "小さな盾(次の痛手-8)", power: 8 }, explore: { rooms: ["a3", "t5"], label: "足場を組んでもらう" }, stages: ["ちびトカゲ", "歯車トカゲ", "真鍮の工匠"] },
  { id: "mossdeer", name: "苔鹿", system: "nature", desc: "背に苔と小さな花を生やした小鹿", times: ["dawn", "day"], likes: "wait", favorite: "glowmoss", spells: ["nature-1"], personality: "patience",
    battle: { kind: "heal", label: "体力を分ける(+12)", power: 12 }, explore: { rooms: ["t4"], label: "つたに道をゆずってもらう" }, stages: ["仔鹿", "若鹿", "森苔の大鹿"] },
  { id: "salamander", name: "灯尾サラマンダー", system: "elemental", desc: "尾の先に小さな炎を灯す、元気なトカゲ", times: "any", likes: "run", favorite: "starshard", spells: ["elemental-1"], personality: "competitiveness",
    battle: { kind: "attack", label: "炎を吐く(威力10)", power: 10 }, explore: { rooms: ["t2", "a4"], label: "尾の炎で照らしてもらう" }, stages: ["火種トカゲ", "灯尾サラマンダー", "焔尾の守護獣"] },
  { id: "stoneward", name: "石守り", system: "ancient", desc: "遺跡から来た、手のひらほどの石像の守り手", times: "any", weather: "mist", likes: "ancient", favorite: "oldpaper", spells: ["ancient-1"], personality: "prudence",
    battle: { kind: "unseal", label: "硬い殻やためた力を解く" }, explore: { rooms: ["t3", "a6"], label: "碑文の意味を教えてもらう" }, stages: ["小石守り", "石守り", "遺跡の番人"] },
  { id: "windjelly", name: "風渡りクラゲ", system: "elemental", desc: "宙を漂う透明なクラゲ。風と共に渡り歩く", times: "any", weather: "rain", likes: "wait", favorite: "stardust", spells: ["astral-1", "mind-1"], personality: "adventurousness",
    battle: { kind: "net", label: "風で相手を1ターン止める" }, explore: { rooms: ["t5"], label: "風で向こう岸へ渡してもらう" }, stages: ["ちびクラゲ", "風渡りクラゲ", "嵐渡りの大クラゲ"] },
];
export const creatureById = (id: string) => CREATURES.find((c) => c.id === id);
/** 物語(5c)で出会う特別な生物。図鑑では「？？？」のまま */
export const HIDDEN_CREATURE = { id: "sevenstar", name: "七つ星の仔" };

export const STAGE_AT = [0, 40, 80];
export const stageIndex = (aff: number) => (aff >= 80 ? 2 : aff >= 40 ? 1 : 0);
export const STAGE_NAMES = ["幼体", "若体", "成体"];
