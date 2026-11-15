import { useMemo, useState } from "react";
import { PERSONALITY_KEYS, PERSONALITY_LABELS, type ExperienceEvent, type PersonalityKey } from "../schemas";
import { addDays, monthlyPersonality, personalityAt, recordingSince, turningPoints, type PersonalitySnapshot } from "../game/growth/personalityHistory";
import { todayLocal } from "../utils/id";

const C = 130, R = 88, N = PERSONALITY_KEYS.length;
const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [C + Math.cos(a) * R * v / 100, C + Math.sin(a) * R * v / 100]; };
const poly = (v: (i: number) => number) => PERSONALITY_KEYS.map((_, i) => pt(i, v(i)).join(",")).join(" ");
const val = (s: PersonalitySnapshot, k: PersonalityKey) => s[k] ?? 20; // 形になる前はいちばん内側

/** 10の性格のレーダー。比べる時点(点線)と今(実線)を重ねる */
function Radar({ then, now }: { then: PersonalitySnapshot; now: PersonalitySnapshot }) {
  return (
    <svg viewBox="0 0 260 260" className="mx-auto w-full max-w-[280px]" role="img" aria-label="性格の重ねた図">
      {[25, 50, 75, 100].map((g) => <polygon key={g} points={poly(() => g)} fill="none" stroke="#a98bff" strokeOpacity={g === 100 ? .45 : .16} />)}
      {PERSONALITY_KEYS.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="#a98bff" strokeOpacity=".16" />; })}
      <polygon points={poly((i) => val(then, PERSONALITY_KEYS[i]))} fill="none" stroke="#b9a6dc" strokeWidth="1.4" strokeDasharray="4 3" />
      <polygon points={poly((i) => val(now, PERSONALITY_KEYS[i]))} fill="#d4b25e" fillOpacity=".25" stroke="#e8cf86" strokeWidth="1.6" />
      {PERSONALITY_KEYS.map((k, i) => { const [x, y] = pt(i, 126); return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#e9e4f7">{PERSONALITY_LABELS[k]}</text>; })}
    </svg>
  );
}

/** ひとつの性格の、月末ごとの折れ線 */
function Line({ points }: { points: { month: string; v: number | null }[] }) {
  const W = 300, H = 120, pad = { l: 26, r: 8, t: 10, b: 20 };
  const xs = (i: number) => pad.l + (points.length <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const ys = (v: number) => pad.t + (1 - (v - 20) / 80) * (H - pad.t - pad.b);
  const drawn = points.map((p, i) => ({ ...p, i })).filter((p) => p.v != null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="月ごとの推移">
      {[20, 60, 100].map((g) => <g key={g}><line x1={pad.l} x2={W - pad.r} y1={ys(g)} y2={ys(g)} stroke="#a98bff" strokeOpacity=".15" /><text x={pad.l - 4} y={ys(g)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#9d93c4">{g}</text></g>)}
      {drawn.length > 1 && <polyline points={drawn.map((p) => `${xs(p.i)},${ys(p.v!)}`).join(" ")} fill="none" stroke="#e8cf86" strokeWidth="1.8" />}
      {drawn.map((p) => <circle key={p.month} cx={xs(p.i)} cy={ys(p.v!)} r="2.6" fill="#e8cf86" />)}
      {points.map((p, i) => (points.length <= 6 || i % Math.ceil(points.length / 6) === 0 || i === points.length - 1) && <text key={p.month} x={xs(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#9d93c4">{Number(p.month.slice(5))}月</text>)}
    </svg>
  );
}

export default function PersonalityShift({ experiences, diagnosedAt }: { experiences: ExperienceEvent[]; diagnosedAt: string | null }) {
  const today = todayLocal();
  const [cmp, setCmp] = useState<"start" | "3m">("start");
  const [trait, setTrait] = useState<PersonalityKey | null>(null);
  const rec = recordingSince(experiences, diagnosedAt, today);
  const data = useMemo(() => {
    const now = personalityAt(experiences, today);
    const startDate = rec.first ?? today;
    return { now, start: personalityAt(experiences, startDate), m3: personalityAt(experiences, addDays(today, -90)), monthly: monthlyPersonality(experiences, today), turns: turningPoints(experiences).reverse() };
  }, [experiences, today, rec.first]);
  if (!rec.ready) return <p className="text-sm text-arcane-300" data-testid="shift-recording">まだ記録中。{rec.first ? `${addDays(rec.first, 30).slice(5).replace("-", "月")}日ごろから` : "経験を承認しはじめて30日たつと"}、性格の移り変わりが見えてくる。</p>;
  const then = cmp === "start" ? data.start : data.m3;
  const diffs = PERSONALITY_KEYS.map((k) => ({ k, d: (data.now[k] ?? 20) - (then[k] ?? 20) })).filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 2);
  const sel = trait ?? diffs[0]?.k ?? PERSONALITY_KEYS[0];
  return (
    <div className="grid gap-3" data-testid="personality-shift">
      <div className="flex gap-2 text-xs">
        {(["start", "3m"] as const).map((c) => <button key={c} aria-pressed={cmp === c} onClick={() => setCmp(c)} className={`pill ${cmp === c ? "bg-gold-500/20 text-gold-200" : "bg-night-800 text-arcane-300"}`}>{c === "start" ? (diagnosedAt ? "入学診断のとき" : "記録のはじめ") : "3か月前"}と比べる</button>)}
      </div>
      <Radar then={then} now={data.now} />
      <p className="text-xs text-arcane-300">点線が{cmp === "start" ? (diagnosedAt ? "入学診断のとき" : "記録のはじめ") : "3か月前"}、実線がいま。まだ形になっていない性格はいちばん内側に置いている。</p>
      {diffs.length > 0 && <p className="text-sm">{diffs.map((x) => `「${PERSONALITY_LABELS[x.k]}」`).join("と")}が前に出てきた。</p>}
      <div>
        <p className="label mb-1">月ごとの推移</p>
        <div className="mb-1 flex flex-wrap gap-1">{PERSONALITY_KEYS.map((k) => <button key={k} aria-pressed={sel === k} onClick={() => setTrait(k)} className={`pill text-[11px] ${sel === k ? "bg-gold-500/20 text-gold-200" : "bg-night-800 text-arcane-300"}`}>{PERSONALITY_LABELS[k]}</button>)}</div>
        <Line points={data.monthly.map((m) => ({ month: m.month, v: m.values[sel] }))} />
      </div>
      <div>
        <p className="label mb-1">心の転機</p>
        {data.turns.length ? (
          <ul className="grid gap-1.5 text-sm" data-testid="turning-points">
            {data.turns.slice(0, 6).map((t) => <li key={t.date + t.key} className="rounded-lg bg-night-800/60 px-3 py-1.5"><span className="num text-xs text-arcane-300">{t.date.slice(5).replace("-", "/")}</span> この1か月で{t.label}が<span className="num text-gold-200">+{t.diff}</span>。{t.events.length > 0 && <span className="text-xs text-arcane-300">きっかけになった経験:{t.events.map((e) => e.title).join("、")}</span>}</li>)}
          </ul>
        ) : <p className="text-xs text-arcane-300">30日でひとつの性格が5以上動いたとき、ここと年表に残る。</p>}
      </div>
    </div>
  );
}
