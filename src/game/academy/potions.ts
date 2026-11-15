/**
 * 魔法薬研究棟と星影の庭園(世界設定書 Phase 6a でげんたが承認:https://claude.ai/artifact/RvkjaHEMf8eqZPCySi5yYv)。
 * 純粋関数。基本ステータス・性格・魔法適性は変えない。魔法薬の効き目はゲームの中(戦闘・探索・保護区)だけ。
 */
import type { CategoryKey, Character, MagicKey } from "../../schemas";
import { P } from "../growth/rules";
import { materialById } from "./explore";
import { proficiencyOf, unitCounts } from "./engine";
import { recOf } from "./creaturesEngine";

export type PotionUse = "battle" | "explore" | "sanctuary";
export type Potion = {
  id: string; name: string; mats: [string, string]; effect: string; use: PotionUse; course: MagicKey; unit: number;
  battle?: { hp?: number; sp?: number; mp?: number; shield?: number }; rooms?: string[];
};
export const POTIONS: Potion[] = [
  { id: "heal", name: "癒やしの水薬", mats: ["sunherb", "glowmoss"], effect: "体力+25", use: "battle", course: "nature", unit: 2, battle: { hp: 25 } },
  { id: "calmdraught", name: "月光の気付け薬", mats: ["moonherb", "violetink"], effect: "精神力+20", use: "battle", course: "nature", unit: 3, battle: { sp: 20 } },
  { id: "elixir", name: "星砂の霊薬", mats: ["stardust", "moonherb"], effect: "魔力+15", use: "battle", course: "creation", unit: 2, battle: { mp: 15 } },
  { id: "ward", name: "守りの香油", mats: ["oldpaper", "sunherb"], effect: "次の痛手-12", use: "battle", course: "creation", unit: 3, battle: { shield: 12 } },
  { id: "lamp", name: "灯りの香油", mats: ["candlestand", "glowmoss"], effect: "暗い部屋を通れる", use: "explore", course: "creation", unit: 1, rooms: ["t2", "a4"] },
  { id: "float", name: "浮き足の薬", mats: ["stardust", "glowmoss"], effect: "割れた床の大穴・風の吹き抜けを渡れる", use: "explore", course: "creation", unit: 4, rooms: ["t5", "w3"] },
  { id: "bait", name: "好物の練り餌", mats: ["stardust", "sunherb"], effect: "どの生き物にも好物と同じだけ効く", use: "sanctuary", course: "nature", unit: 1 },
  { id: "calm", name: "安らぎの香", mats: ["moonherb", "glowmoss"], effect: "その出会いの心の距離が最初から-2", use: "sanctuary", course: "nature", unit: 4 },
];
export const potionById = (id: string) => POTIONS.find((p) => p.id === id);
/** 持ち物での名前。上質は id の後ろに ":fine" */
export const potionItemId = (id: string, fine: boolean) => `potion:${id}${fine ? ":fine" : ""}`;
export const parsePotionItem = (itemId: string) => { const m = itemId.match(/^potion:([a-z]+)(:fine)?$/); return m ? { potion: potionById(m[1]), fine: !!m[2] } : null; };
export const itemName = (id: string) => { const p = parsePotionItem(id); return p?.potion ? `${p.potion.name}${p.fine ? "(上質)" : ""}` : materialById(id)?.name ?? id; };

type Inv = Character["inventory"];
export const qty = (inv: Inv, id: string) => inv.find((i) => i.id === id)?.qty ?? 0;
export function addItem(inv: Inv, id: string, n: number): Inv {
  const has = inv.find((i) => i.id === id);
  const next = has ? inv.map((i) => (i.id === id ? { ...i, qty: i.qty + n } : i)) : [...inv, { id, name: itemName(id), qty: n }];
  return next.filter((i) => i.qty > 0);
}
/** その魔法薬を持っている数(上質とふつうの合計) */
export const potionCount = (inv: Inv, id: string) => qty(inv, potionItemId(id, false)) + qty(inv, potionItemId(id, true));
/** 使うときは上質から */
export function takePotion(inv: Inv, id: string): { inv: Inv; fine: boolean } {
  if (qty(inv, potionItemId(id, true)) > 0) return { inv: addItem(inv, potionItemId(id, true), -1), fine: true };
  if (qty(inv, potionItemId(id, false)) > 0) return { inv: addItem(inv, potionItemId(id, false), -1), fine: false };
  throw new Error("その魔法薬を持っていない");
}

/* ---------- 調合 ---------- */
export const recipeOpen = (ch: Character, p: Potion) => (unitCounts(ch, p.course)[p.unit - 1] ?? 0) > 0;
export const isFine = (ch: Character) => proficiencyOf(ch, "nature") + proficiencyOf(ch, "creation") >= P.brewFineProf;
export function brew(ch: Character, potionId: string, todayCount: number, now: string) {
  const p = potionById(potionId); if (!p) throw new Error("その魔法薬はない");
  if (todayCount >= P.brewPerDay) throw new Error(`今日の調合はもう${P.brewPerDay}回した。また明日`);
  if (!recipeOpen(ch, p)) throw new Error("まだ調合法を知らない");
  if (potionCount(ch.inventory, p.id) >= P.potionMax) throw new Error(`${p.name}はもう${P.potionMax}個持っている`);
  let inv = ch.inventory;
  for (const m of p.mats) { if (qty(inv, m) < 1) throw new Error(`材料(${materialById(m)?.name})が足りない`); inv = addItem(inv, m, -1); }
  const fine = isFine(ch);
  inv = addItem(inv, potionItemId(p.id, fine), 1);
  const k = p.course, prof = Math.min(100, Math.round((proficiencyOf(ch, k) + P.brewProf) * 10) / 10);
  return { character: { ...ch, inventory: inv, academy: { ...ch.academy, proficiency: { ...ch.academy.proficiency, [k]: prof } }, updatedAt: now }, potion: p, fine, prof: prof - proficiencyOf(ch, k) };
}

/* ---------- 庭園 ---------- */
/** 経験の種類ごとの花(承認した日に、その日いちばん多い種類の花が咲く) */
export const FLOWERS: Record<CategoryKey, { name: string; color: string }> = {
  sports: { name: "紅い星花", color: "#e0584e" },
  creative: { name: "金の螺旋花", color: "#e2bf6e" },
  learning: { name: "青い鈴花", color: "#7fa8f0" },
  relationship: { name: "桃色の結び花", color: "#f0a0c0" },
  challenge: { name: "橙の灯り花", color: "#f0a050" },
  work: { name: "白い星鈴", color: "#e9e4f7" },
  music: { name: "紫の歌花", color: "#c8b4f0" },
  reflection: { name: "月影の花", color: "#b9cdf5" },
  other: { name: "若葉の花", color: "#9fd98a" },
};
export type Bloom = { date: string; category: CategoryKey; titles: string[] };
/** その月の花壇(承認した経験の日付ごとに1輪) */
export function flowerbed(evs: { date: string; category: CategoryKey; title: string; analysisStatus: string }[], month: string): Bloom[] {
  const by = new Map<string, { cats: Record<string, number>; titles: string[] }>();
  for (const e of evs) {
    if (e.analysisStatus !== "applied" || !e.date.startsWith(month)) continue;
    const d = by.get(e.date) ?? { cats: {}, titles: [] }; d.cats[e.category] = (d.cats[e.category] ?? 0) + 1; d.titles.push(e.title); by.set(e.date, d);
  }
  return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, d]) => ({ date, category: Object.entries(d.cats).sort((a, b) => b[1] - a[1])[0][0] as CategoryKey, titles: d.titles }));
}
/** 庭を歩く(1日1回):休息(その日の演習の最大値+10%)・相棒のなつき+2・薬草 */
export function walkGarden(ch: Character, input: { today: string; daytime: boolean; bloomsThisMonth: number }, now: string) {
  if (ch.world.garden.lastWalk === input.today) throw new Error("今日はもう庭を歩いた。また明日");
  const herb = input.daytime ? "sunherb" : "moonherb";
  const n = input.bloomsThisMonth >= P.gardenBloomsForTwo ? 2 : 1;
  let c: Character = { ...ch, inventory: addItem(ch.inventory, herb, n), world: { ...ch.world, garden: { lastWalk: input.today, restDate: input.today } }, updatedAt: now };
  const comp = ch.world.companion;
  if (comp && recOf(ch, comp).friend) {
    const r = recOf(c, comp);
    c = { ...c, world: { ...c.world, creatures: { ...c.world.creatures, [comp]: { ...r, affection: Math.min(100, r.affection + P.gardenAffection) } } } };
  }
  return { character: c, herb, n, companion: comp };
}
