/**
 * ルールエンジン:能力値・経験値・レベルの変化はすべてここを通す(指示書 1章)。
 * 純粋関数のみ。保存は services/storage が行う。
 */
import { STAT_KEYS, type Character, type ExperienceEvent, type Growth, type StatHistory, type StatKey } from "../../schemas";
import { CATEGORY_DEFS, P, RULES_VERSION, expToNext } from "./rules";
import { affinityValue, personalityValue } from "./formation";

const round1 = (n: number) => Math.round(n * 10) / 10;
const dayDiff = (a: string, b: string) => Math.abs((Date.parse(a) - Date.parse(b)) / 86400000);
const normTitle = (t: string) => t.replace(/\s+/g, "").toLowerCase();

/** 同じ経験(カテゴリ+タイトル)を直近で何回反映したか */
export function repeatCount(ev: Pick<ExperienceEvent, "category" | "title" | "date" | "id">, past: ExperienceEvent[]): number {
  return past.filter((p) => p.id !== ev.id && p.analysisStatus === "applied" && p.category === ev.category
    && normTitle(p.title) === normTitle(ev.title) && dayDiff(p.date, ev.date) <= P.repeatWindowDays).length;
}

/** 経験から成長ポイントを出す(難易度・継続・振り返り・繰り返し) */
export function growthPoints(ev: Pick<ExperienceEvent, "difficulty" | "duration" | "reflection">, repeats: number) {
  const base = P.basePoints[ev.difficulty] ?? 1;
  const dur = 1 + Math.min(ev.duration / P.durationFullMinutes, 1) * P.durationMaxBonus;
  const refl = ev.reflection.trim().length >= P.reflectionMinChars ? 1 + P.reflectionBonus : 1;
  const rep = 1 / (1 + P.repeatDecay * repeats);
  return { base, dur, refl, rep, total: base * dur * refl * rep };
}

/** 成長の提案を作る(AI分析の代わりのルール版。AIでもこの形で返す) */
export function proposeGrowth(ev: ExperienceEvent, past: ExperienceEvent[]): Growth {
  const def = CATEGORY_DEFS[ev.category];
  const repeats = repeatCount(ev, past);
  const pts = growthPoints(ev, repeats);
  const stats: Partial<Record<StatKey, number>> = {};
  for (const [k, w] of Object.entries(def.stats) as [StatKey, number][]) stats[k] = round1(pts.total * w);
  const notes = [
    `${def.label}・難易度${ev.difficulty}:基本${pts.base}`,
    ev.duration ? `継続 ${ev.duration}分:×${pts.dur.toFixed(2)}` : "",
    pts.refl > 1 ? `振り返りあり:×${pts.refl}` : "振り返りを書くと伸びが+20%",
    repeats ? `直近${P.repeatWindowDays}日で同じ経験${repeats}回:×${pts.rep.toFixed(2)}` : "",
  ].filter(Boolean);
  // 性格・魔法の兆し:種類ごとのルール + AIの読み取り(あれば)。能力値には AI を使わない
  const add = (rule: Partial<Record<string, number>>, ai?: Partial<Record<string, number>>) => {
    const m: Record<string, number> = {};
    for (const [k, w] of Object.entries(rule)) m[k] = (m[k] ?? 0) + (w ?? 0);
    for (const [k, w] of Object.entries(ai ?? {})) m[k] = (m[k] ?? 0) + (w ?? 0) * P.aiSignalWeight;
    return Object.fromEntries(Object.entries(m).filter(([, w]) => w > 0).map(([k, w]) => [k, round1(w * pts.total / 2)]));
  };
  if (ev.ai) notes.push(`AIの読み取り(${ev.ai.by})を性格・魔法の兆しに反映`);
  return {
    exp: Math.round(pts.total * P.expPerPoint),
    stats, // 確定値は適用時に finalizeStats で決める(画面では予想として表示)
    personalitySignals: add(def.personality, ev.ai?.personality),
    magicSignals: add(def.magic, ev.ai?.magic),
    notes,
    engine: RULES_VERSION,
  };
}

/** 提案された能力変化を、上限・偏り・100の天井に合わせて確定値にする */
export function finalizeStats(proposed: Partial<Record<StatKey, number>>, cur: Character["basicStats"]): Partial<Record<StatKey, number>> {
  const mean = STAT_KEYS.reduce((s, k) => s + cur[k], 0) / STAT_KEYS.length;
  const out: Partial<Record<StatKey, number>> = {};
  for (const [k, raw] of Object.entries(proposed) as [StatKey, number][]) {
    if (!(raw > 0)) continue;
    let g = Math.min(raw, P.perEventStatCap);
    g *= (P.statMax - cur[k]) / P.statMax; // 高いほど伸びにくい
    if (cur[k] > mean + P.imbalanceMargin) g *= 0.5; // 1つだけ突出させない
    g = Math.min(round1(g), P.statMax - cur[k]);
    if (g > 0) out[k] = round1(g);
  }
  return out;
}

/** 承認された成長をキャラクターに適用する。同じ経験は2回適用しない */
export function applyGrowth(ch: Character, ev: ExperienceEvent, growth: Growth, now: string, newId: () => string): { character: Character; history: StatHistory[] } {
  if (ch.appliedEventIds.includes(ev.id)) throw new Error("この経験はすでに反映済みです");
  const history: StatHistory[] = [];
  const stats = { ...ch.basicStats };
  for (const [k, g] of Object.entries(finalizeStats(growth.stats, ch.basicStats)) as [StatKey, number][]) {
    const after = Math.min(P.statMax, round1(stats[k] + g));
    history.push({ id: newId(), at: now, eventId: ev.id, kind: "stat", key: k, before: stats[k], after });
    stats[k] = after;
  }
  // 性格:根拠の数と兆しの強さをためて、十分たまったら値が形になる(1回では決めない)
  type PK = keyof Character["personality"]; type MK = keyof Character["magicAffinity"];
  const personality = { ...ch.personality };
  for (const [k, v] of Object.entries(growth.personalitySignals) as [PK, number][]) {
    const cur = personality[k]; if (!(v > 0) || !cur) continue;
    const evidence = cur.evidence + 1, weight = round1(cur.weight + v);
    personality[k] = { evidence, weight, value: personalityValue(evidence, weight) };
  }
  // 魔法適性:兆しをため、入学診断の基礎値があれば値を出す
  const magicAffinity = { ...ch.magicAffinity };
  for (const [k, v] of Object.entries(growth.magicSignals) as [MK, number][]) {
    const cur = magicAffinity[k]; if (!(v > 0) || !cur) continue;
    const signals = round1(cur.signals + v);
    magicAffinity[k] = { ...cur, signals, value: affinityValue(cur.base, signals) };
  }
  // 経験値とレベル
  const expBefore = ch.experience, levelBefore = ch.level;
  let exp = ch.experience + Math.max(0, Math.round(growth.exp)), level = ch.level;
  history.push({ id: newId(), at: now, eventId: ev.id, kind: "exp", key: "experience", before: expBefore, after: exp });
  while (exp >= totalExpForLevel(level + 1)) level++;
  if (level !== levelBefore) history.push({ id: newId(), at: now, eventId: ev.id, kind: "level", key: "level", before: levelBefore, after: level });
  return {
    character: { ...ch, basicStats: stats, personality, magicAffinity, experience: exp, level, updatedAt: now, appliedEventIds: [...ch.appliedEventIds, ev.id] },
    history,
  };
}

/** レベルLに到達するのに必要な累計経験値 */
export function totalExpForLevel(level: number) {
  let t = 0; for (let l = 1; l < level; l++) t += expToNext(l); return t;
}
/** 今のレベルの中での進み具合 */
export function levelProgress(ch: Pick<Character, "level" | "experience">) {
  const start = totalExpForLevel(ch.level), need = expToNext(ch.level);
  return { inLevel: ch.experience - start, need, ratio: Math.max(0, Math.min(1, (ch.experience - start) / need)) };
}
