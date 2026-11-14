import type { ReactNode } from "react";
import { STAT_KEYS, STAT_LABELS, type Stats } from "../schemas";

/** 魔法陣(装飾)。Phase 2 で3Dの演出に置きかえる */
export function MagicCircle({ className = "" }: { className?: string }) {
  const r = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor">
        <g className="spin-slow" style={{ transformOrigin: "100px 100px" }}>
          <circle cx="100" cy="100" r="96" strokeWidth=".6" opacity=".7" />
          <circle cx="100" cy="100" r="88" strokeWidth=".4" strokeDasharray="2 4" opacity=".6" />
          {r.map((a) => <line key={a} x1="100" y1="4" x2="100" y2="12" strokeWidth=".8" transform={`rotate(${a} 100 100)`} />)}
        </g>
        <g className="spin-rev" style={{ transformOrigin: "100px 100px" }}>
          <polygon points="100,22 168,140 32,140" strokeWidth=".6" opacity=".7" />
          <polygon points="100,178 32,60 168,60" strokeWidth=".6" opacity=".7" />
          <circle cx="100" cy="100" r="44" strokeWidth=".5" opacity=".6" />
        </g>
      </g>
    </svg>
  );
}

/** 主人公の仮の姿(シルエット)。Phase 2 で3Dモデルに差しかえ */
export function HeroSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 200" className={className} aria-label="主人公(仮の姿)" role="img">
      <defs>
        <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2e6e" /><stop offset="1" stopColor="#120f22" /></linearGradient>
        <radialGradient id="orb"><stop offset="0" stopColor="#f3e2b0" /><stop offset=".5" stopColor="#a98bff" stopOpacity=".6" /><stop offset="1" stopColor="#a98bff" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="192" rx="38" ry="6" fill="#000" opacity=".45" />
      <path d="M60 52 C36 58 30 90 26 120 L18 188 L102 188 L94 120 C90 90 84 58 60 52Z" fill="url(#robe)" stroke="#b8913c" strokeOpacity=".5" />
      <path d="M60 60 L52 188 M60 60 L68 188" stroke="#b8913c" strokeOpacity=".35" />
      <circle cx="60" cy="38" r="17" fill="#1b1733" stroke="#b8913c" strokeOpacity=".5" />
      <path d="M43 36 C44 18 76 18 77 36 C72 28 50 26 43 36Z" fill="#0b0a14" />
      <line x1="96" y1="96" x2="112" y2="40" stroke="#d4b25e" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="112" cy="38" r="10" fill="url(#orb)" className="flicker" />
    </svg>
  );
}

export function Bar({ value, max = 100, tone = "gold" }: { value: number; max?: number; tone?: "gold" | "arcane" }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-night-700/80">
      <div className={`h-full rounded-full ${tone === "gold" ? "bg-gradient-to-r from-gold-500 to-gold-300" : "bg-gradient-to-r from-arcane-600 to-arcane-300"}`} style={{ width: `${w}%` }} />
    </div>
  );
}

/** 7能力のレーダー(0〜100) */
export function StatRadar({ stats, size = 260 }: { stats: Stats; size?: number }) {
  const c = 130, R = 92, n = STAT_KEYS.length;
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [c + Math.cos(a) * R * v / 100, c + Math.sin(a) * R * v / 100]; };
  const poly = (v: (i: number) => number) => STAT_KEYS.map((_, i) => pt(i, v(i)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 260 260" width={size} height={size} className="max-w-full" role="img" aria-label="能力のバランス">
      {[25, 50, 75, 100].map((g) => <polygon key={g} points={poly(() => g)} fill="none" stroke="#a98bff" strokeOpacity={g === 100 ? .45 : .18} />)}
      {STAT_KEYS.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#a98bff" strokeOpacity=".18" />; })}
      <polygon points={poly((i) => stats[STAT_KEYS[i]])} fill="#d4b25e" fillOpacity=".28" stroke="#e8cf86" strokeWidth="1.5" />
      {STAT_KEYS.map((k, i) => { const [x, y] = pt(i, 122); return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#e9e4f7">{STAT_LABELS[k].name}</text>; })}
    </svg>
  );
}

export function Panel({ title, children, right, className = "" }: { title?: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`panel p-4 sm:p-5 ${className}`}>
      {(title || right) && <div className="mb-3 flex items-center justify-between gap-3">{title && <h2 className="panel-title">{title}</h2>}{right}</div>}
      {children}
    </section>
  );
}

export const statusPill: Record<string, { label: string; cls: string }> = {
  pending: { label: "分析中", cls: "bg-night-700 text-arcane-300" },
  proposed: { label: "承認まち", cls: "bg-candle/20 text-candle" },
  applied: { label: "反映済み", cls: "bg-gold-500/20 text-gold-200" },
  rejected: { label: "見送り", cls: "bg-night-700 text-arcane-300/60" },
};
