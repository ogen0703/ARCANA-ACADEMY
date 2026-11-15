/**
 * 性格の移り変わり(世界設定書 Phase 5b でげんたが承認)。
 * 承認した経験に残っている「性格の兆し」を日付順にたどり直して、ある日の性格を求める。純粋関数で、値は何も変えない。
 */
import { PERSONALITY_KEYS, PERSONALITY_LABELS, type ExperienceEvent, type PersonalityKey } from "../../schemas";
import { personalityValue } from "./formation";
import { P } from "./rules";

export type PersonalitySnapshot = Record<PersonalityKey, number | null>;
const r1 = (n: number) => Math.round(n * 10) / 10;
const addDays = (ymd: string, n: number) => { const d = new Date(`${ymd}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const appliedSorted = (evs: ExperienceEvent[]) => evs.filter((e) => e.analysisStatus === "applied").sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

/** その日(を含む)までに承認した経験から求めた性格 */
export function personalityAt(evs: ExperienceEvent[], date: string): PersonalitySnapshot {
  const acc = Object.fromEntries(PERSONALITY_KEYS.map((k) => [k, { evidence: 0, weight: 0 }])) as Record<PersonalityKey, { evidence: number; weight: number }>;
  for (const e of appliedSorted(evs)) {
    if (e.date > date) break;
    for (const [k, v] of Object.entries(e.approvedGrowth?.personalitySignals ?? {}) as [PersonalityKey, number][]) {
      if (!(v > 0) || !acc[k]) continue;
      acc[k] = { evidence: acc[k].evidence + 1, weight: r1(acc[k].weight + v) };
    }
  }
  return Object.fromEntries(PERSONALITY_KEYS.map((k) => [k, personalityValue(acc[k].evidence, acc[k].weight)])) as PersonalitySnapshot;
}

/** 月末ごとの性格(最初に経験を承認した月から今月まで) */
export function monthlyPersonality(evs: ExperienceEvent[], today: string) {
  const list = appliedSorted(evs); if (!list.length) return [];
  const out: { month: string; values: PersonalitySnapshot }[] = [];
  let y = Number(list[0].date.slice(0, 4)), m = Number(list[0].date.slice(5, 7));
  const endY = Number(today.slice(0, 4)), endM = Number(today.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    const last = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    out.push({ month: end.slice(0, 7), values: personalityAt(evs, end < today ? end : today) });
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

export type TurningPoint = { date: string; key: PersonalityKey; label: string; diff: number; events: { id: string; title: string }[] };
/** 心の転機:30日のあいだに、ひとつの性格が5以上動いたとき(同じ性格は30日に1回まで) */
export function turningPoints(evs: ExperienceEvent[]): TurningPoint[] {
  const list = appliedSorted(evs); const out: TurningPoint[] = [];
  const lastAt: Partial<Record<PersonalityKey, string>> = {};
  const dates = [...new Set(list.map((e) => e.date))];
  for (const d of dates) {
    const now = personalityAt(evs, d), before = personalityAt(evs, addDays(d, -P.turningDays));
    for (const k of PERSONALITY_KEYS) {
      if (now[k] == null || before[k] == null) continue; // 形になったばかりの性格は転機に数えない
      const diff = now[k]! - before[k]!;
      if (diff < P.turningPoint) continue;
      if (lastAt[k] && addDays(lastAt[k]!, P.turningDays) > d) continue;
      lastAt[k] = d;
      const from = addDays(d, -P.turningDays);
      const evsIn = list.filter((e) => e.date > from && e.date <= d && (e.approvedGrowth?.personalitySignals?.[k] ?? 0) > 0)
        .sort((a, b) => (b.approvedGrowth!.personalitySignals[k] ?? 0) - (a.approvedGrowth!.personalitySignals[k] ?? 0)).slice(0, 3);
      out.push({ date: d, key: k, label: PERSONALITY_LABELS[k], diff, events: evsIn.map((e) => ({ id: e.id, title: e.title })) });
    }
  }
  return out;
}

/** 期間のはじめと終わりで、いちばん前に出てきた性格 */
export function biggestShift(evs: ExperienceEvent[], from: string, to: string) {
  const a = personalityAt(evs, addDays(from, -1)), b = personalityAt(evs, to);
  let best: { key: PersonalityKey; label: string; diff: number } | null = null;
  for (const k of PERSONALITY_KEYS) {
    if (b[k] == null) continue;
    const diff = b[k]! - (a[k] ?? 20);
    if (diff > 0 && (!best || diff > best.diff)) best = { key: k, label: PERSONALITY_LABELS[k], diff };
  }
  return best;
}

/** 記録を始めて30日たったか(まだなら「記録中」) */
export function recordingSince(evs: ExperienceEvent[], diagnosedAt: string | null, today: string) {
  const first = diagnosedAt?.slice(0, 10) ?? appliedSorted(evs)[0]?.date ?? null;
  return { first, ready: !!first && addDays(first, P.turningDays) <= today };
}
export { addDays };
