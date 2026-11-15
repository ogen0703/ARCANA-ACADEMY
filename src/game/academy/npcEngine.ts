/** 学院の人たちとの交流(Phase 4d)。純粋関数。信頼度は「絆」とは別。基本ステータス・性格・兆しは変えない */
import type { Character } from "../../schemas";
import { P } from "../growth/rules";
import { NPCS, npcById, type Npc } from "./npc";
import { materialById } from "./explore";

export const trustOf = (ch: Character, id: string) => ch.relationships.find((r) => r.id === id)?.bond ?? 0;
const mult = (ch: Character) => 1 + ch.basicStats.bond / 100;
const gainOf = (ch: Character, base: number) => Math.max(1, Math.round(base * mult(ch)));
export const topicIndex = (ch: Character, npc: Npc) => (ch.world.npcTopics[npc.id] ?? 0) % npc.topics.length;
export const canResonate = (ch: Character) => ch.learnedSpells.includes("mind-2");

export function setTrust(ch: Character, npc: Npc, add: number, now: string) {
  const before = trustOf(ch, npc.id); const after = Math.min(100, before + add);
  const rel = ch.relationships.some((r) => r.id === npc.id)
    ? ch.relationships.map((r) => (r.id === npc.id ? { ...r, bond: after } : r))
    : [...ch.relationships, { id: npc.id, name: npc.name, bond: after }];
  let c: Character = { ...ch, relationships: rel, updatedAt: now };
  if (after >= P.trustTitle && !c.titles.some((t) => t.name === npc.title)) c = { ...c, titles: [...c.titles, { id: `t-${c.titles.length + 1}`, name: npc.title, at: now }] };
  const episodes = [20, 70].filter((th) => before < th && after >= th).map((th) => (th === 20 ? 0 : 1));
  return { character: c, before, after, episodes, titled: before < P.trustTitle && after >= P.trustTitle };
}

/** 話す。todayCount はその人と今日話した回数。1回目は話題つき(choice 0〜2、3=共鳴の声)、2回目からはひとこと */
export function talk(ch: Character, npcId: string, choice: number | null, todayCount: number, now: string) {
  const npc = npcById(npcId); if (!npc) throw new Error("その人はいません");
  if (todayCount >= P.talksPerDay) throw new Error(`今日はもう${P.talksPerDay}回話した。また明日`);
  if (todayCount === 0) {
    const ti = topicIndex(ch, npc), topic = npc.topics[ti];
    if (choice == null || choice < 0 || choice > 3) throw new Error("答えを選んでね");
    if (choice === 3 && !canResonate(ch)) throw new Error("「共鳴の声」をまだ覚えていない");
    const base = choice === 3 ? P.trustResonate : topic.choices[choice].hit ? P.trustHit : P.trustOther;
    const reply = choice === 3 ? topic.resonate : topic.choices[choice].reply;
    const r = setTrust(ch, npc, gainOf(ch, base), now);
    const c = { ...r.character, world: { ...r.character.world, npcTopics: { ...r.character.world.npcTopics, [npc.id]: (ch.world.npcTopics[npc.id] ?? 0) + 1 }, answers: [...r.character.world.answers, `${npc.id}:${ti}:${choice}`] } };
    return { ...r, character: c, kind: "talk" as const, reply, gain: r.after - r.before, hit: choice === 3 || topic.choices[choice].hit };
  }
  const line = npc.chats[(todayCount - 1) % npc.chats.length];
  const r = setTrust(ch, npc, gainOf(ch, P.trustChat), now);
  return { ...r, kind: "chat" as const, reply: line, gain: r.after - r.before, hit: false };
}

/** 贈り物(1人1日1回) */
export function gift(ch: Character, npcId: string, itemId: string, giftedToday: boolean, now: string) {
  const npc = npcById(npcId); if (!npc) throw new Error("その人はいません");
  if (giftedToday) throw new Error("今日はもう贈り物をした");
  const has = ch.inventory.find((i) => i.id === itemId);
  if (!has || has.qty < 1) throw new Error("その素材を持っていない");
  const liked = npc.gift === itemId;
  const inv = ch.inventory.map((i) => (i.id === itemId ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0);
  const r = setTrust({ ...ch, inventory: inv }, npc, gainOf(ch, liked ? P.trustGiftLiked : P.trustGift), now);
  return { ...r, liked, gain: r.after - r.before };
}

/** 仲間(信頼40以上)が好きな素材をお裾分けしてくれる(1日1回) */
export function canReceive(ch: Character, npcId: string) {
  const npc = npcById(npcId);
  return !!npc && npc.kind === "classmate" && trustOf(ch, npcId) >= 40;
}
export function receive(ch: Character, npcId: string, receivedToday: boolean, now: string) {
  if (!canReceive(ch, npcId)) throw new Error("まだもらえない");
  if (receivedToday) throw new Error("今日はもうもらった");
  const npc = npcById(npcId)!; const id = npc.gift;
  const has = ch.inventory.find((i) => i.id === id);
  const inv = has ? ch.inventory.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)) : [...ch.inventory, { id, name: materialById(id)?.name ?? id, qty: 1 }];
  return { character: { ...ch, inventory: inv, updatedAt: now }, item: id };
}

/** 先生の信頼が40以上なら、その講座の熟練度が伸びやすい */
export function lessonTrustMult(ch: Character, course: string) {
  const t = NPCS.find((n) => n.course === course);
  return t && trustOf(ch, t.id) >= P.trustLessonStage ? P.trustLessonMult : 1;
}
/** 読める昔話(信頼20で1つ目、70で2つ目) */
export function episodesOf(ch: Character, npcId: string) {
  const npc = npcById(npcId)!; const t = trustOf(ch, npcId);
  return npc.episodes.filter((_, i) => t >= (i === 0 ? 20 : 70));
}
