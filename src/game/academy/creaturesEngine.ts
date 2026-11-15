/** 魔法生物と相棒(Phase 5a)。純粋関数。基本ステータス・性格・兆しは変えない */
import type { Character } from "../../schemas";
import type { TimeKey, WeatherKey } from "../world/ambience";
import { P } from "../growth/rules";
import { APPROACHES, CREATURES, creatureById, stageIndex, type Creature } from "./creatures";
import { materialById } from "./explore";

export const recOf = (ch: Character, id: string) => ch.world.creatures[id] ?? { friend: false, attempts: 0, affection: 0 };
export const qtyOf = (ch: Character, id: string) => ch.inventory.find((i) => i.id === id)?.qty ?? 0;

/** 今の時間帯・天候で会える生物 */
export function available(time: TimeKey, weather: WeatherKey) {
  return CREATURES.filter((c) => (c.times === "any" || c.times.includes(time)) && (!c.weather || c.weather === weather));
}
/** 出会う生物を決める(種から決まる。適性が高い系統・まだ仲間でない生物が出やすい) */
export function encounter(ch: Character, time: TimeKey, weather: WeatherKey, seed: number): Creature {
  const list = available(time, weather);
  // 夜咲きの灯(複合魔法)を覚えていると、夜に夜の生き物と出会いやすい
  const night = time === "night" && ch.world.compounds.includes("c-nightbloom");
  const w = list.map((c) => 1 + (ch.magicAffinity[c.system].value ?? 0) / 50 + (recOf(ch, c.id).friend ? 0 : 1) + (night && c.times !== "any" ? 2 : 0));
  let r = ((seed * 9301 + 49297) % 233280) / 233280 * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

/** 心の距離のはじまり(相性で近くなる。前に会った分だけ少し近い) */
export function startDistance(ch: Character, c: Creature) {
  let d = P.distanceStart;
  if ((ch.magicAffinity[c.system].value ?? 0) >= 50) d -= P.distanceAffinity;
  if ((ch.personality[c.personality].value ?? 0) >= 60) d -= P.distancePersonality;
  return d - Math.min(P.distanceCarryMax, recOf(ch, c.id).attempts);
}

/** 近づき方の一覧(使えないものは理由つき) */
export function approachOptions(ch: Character, c: Creature) {
  const base = APPROACHES.map((a) => ({ action: a.id as string, label: a.id === "offer" ? `好物(${materialById(c.favorite)?.name})を差し出す` : a.label, ok: a.id === "offer" ? qtyOf(ch, c.favorite) > 0 : !a.needs || ch.learnedSpells.includes(a.needs) }));
  const spells = ch.learnedSpells.filter((s) => ["astral-1", "mind-1", "nature-1", "creation-1", "elemental-1", "ancient-1", "mind-2"].includes(s)).map((s) => ({ action: `spell:${s}`, label: "", ok: true }));
  // 古き声の通訳(複合魔法):古代の生き物には呪文と同じだけ効く
  const old = ch.world.compounds.includes("c-oldvoice") ? [{ action: "spell:c-oldvoice", label: "", ok: true }] : [];
  return [...base, ...spells, ...old];
}

/** 1つの近づき方で、心の距離がどれだけ縮まるか(同じ近づき方の2回目は半分) */
export function approachValue(c: Creature, action: string, used: string[]) {
  const [kind, arg] = action.split(":");
  let v = P.approachOther;
  if (kind === c.likes) v = P.approachLiked;
  else if (kind === "offer") v = P.approachOffer;
  else if (kind === "spell" && (c.spells.includes(arg) || (arg === "c-oldvoice" && c.system === "ancient"))) v = P.approachSpell;
  return used.includes(action) ? Math.floor(v / 2) : v;
}
export const reaction = (v: number) => (v >= 4 ? "うれしそうに近づいてきた" : v >= 3 ? "興味を持ってこちらを見ている" : v >= 2 ? "少しだけ近づいた" : "まだ様子をうかがっている");

/** 保護区を1回訪れる(近づき方は最大3つ。距離が0以下で仲間になる) */
export function visit(ch: Character, input: { creature: string; actions: string[]; visitsToday: number }, now: string) {
  const c = creatureById(input.creature); if (!c) throw new Error("その生物はいません");
  if (input.visitsToday >= P.sanctuaryPerDay) throw new Error(`今日はもう${P.sanctuaryPerDay}回訪れた。また明日`);
  if (input.actions.length < 1 || input.actions.length > P.approachesPerVisit) throw new Error("近づき方は1〜3つ");
  if (recOf(ch, c.id).friend) throw new Error("もう仲間になっている");
  const opts = approachOptions(ch, c);
  let d = startDistance(ch, c); const used: string[] = []; let inv = ch.inventory; const reactions: string[] = [];
  for (const a of input.actions) {
    if (d <= 0) throw new Error("記録が正しくありません");
    const o = opts.find((x) => x.action === a);
    if (!o || !o.ok) throw new Error("その近づき方はできない");
    if (a === "offer") {
      const q = inv.find((i) => i.id === c.favorite)?.qty ?? 0;
      if (q < 1) throw new Error("好物を持っていない");
      inv = inv.map((i) => (i.id === c.favorite ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0);
    }
    const v = approachValue(c, a, used); used.push(a); d -= v; reactions.push(reaction(v));
  }
  const friend = d <= 0;
  const rec = recOf(ch, c.id);
  const world = { ...ch.world, creatures: { ...ch.world.creatures, [c.id]: { ...rec, attempts: rec.attempts + 1, friend } }, companion: ch.world.companion ?? (friend ? c.id : null) };
  let next: Character = { ...ch, inventory: inv, world, updatedAt: now };
  const title = "生き物と心を通わせる者";
  if (friend && !next.titles.some((t) => t.name === title)) next = { ...next, titles: [...next.titles, { id: `t-${next.titles.length + 1}`, name: title, at: now }] };
  return { character: next, friend, reactions, distanceLeft: Math.max(0, d) };
}

function addAffection(ch: Character, id: string, add: number, now: string) {
  const rec = recOf(ch, id); const before = rec.affection; const after = Math.min(100, before + add);
  return { character: { ...ch, world: { ...ch.world, creatures: { ...ch.world.creatures, [id]: { ...rec, affection: after } } }, updatedAt: now }, before, after, grew: stageIndex(after) > stageIndex(before) };
}
/** えさ(好物の素材。1体1日1回) */
export function feed(ch: Character, id: string, fedToday: boolean, now: string) {
  const c = creatureById(id); if (!c || !recOf(ch, id).friend) throw new Error("まだ仲間ではない");
  if (fedToday) throw new Error("今日はもうえさをあげた");
  if (qtyOf(ch, c.favorite) < 1) throw new Error(`好物(${materialById(c.favorite)?.name})を持っていない`);
  const inv = ch.inventory.map((i) => (i.id === c.favorite ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0);
  return addAffection({ ...ch, inventory: inv }, id, P.feedAffection, now);
}
/** 遊ぶ・なでる(1体1日2回) */
export function play(ch: Character, id: string, playsToday: number, now: string) {
  if (!recOf(ch, id).friend) throw new Error("まだ仲間ではない");
  if (playsToday >= P.playsPerDay) throw new Error("今日はもうたくさん遊んだ");
  return addAffection(ch, id, P.playAffection, now);
}
export function setCompanion(ch: Character, id: string, now: string): Character {
  if (!recOf(ch, id).friend) throw new Error("まだ仲間ではない");
  return { ...ch, world: { ...ch.world, companion: id }, updatedAt: now };
}
/** 現実の経験を承認したとき、相棒も少し育つ(1日最大+6) */
export function realBoost(ch: Character, date: string, now: string): Character {
  const id = ch.world.companion; if (!id) return ch;
  const d = ch.world.companionDaily.date === date ? ch.world.companionDaily : { date, gained: 0 };
  const add = Math.min(P.realAffection, P.realAffectionMax - d.gained); if (add <= 0) return ch;
  const r = addAffection(ch, id, add, now);
  return { ...r.character, world: { ...r.character.world, companionDaily: { date, gained: d.gained + add } } };
}

/** 戦闘での相棒の手助け(段階で効きが変わる) */
export function companionSupport(ch: Character) {
  const id = ch.world.companion; const c = id ? creatureById(id) : undefined;
  if (!c) return null;
  const st = stageIndex(recOf(ch, c.id).affection);
  return { id: c.id, name: c.name, kind: c.battle.kind, power: c.battle.power ?? 0, mult: P.companionStageMult[st], label: c.battle.label };
}
/** 探索で相棒が手伝える部屋(若体から) */
export function companionCanPass(ch: Character, roomId: string) {
  const id = ch.world.companion; const c = id ? creatureById(id) : undefined;
  return !!c && recOf(ch, c.id).affection >= 40 && c.explore.rooms.includes(roomId);
}
