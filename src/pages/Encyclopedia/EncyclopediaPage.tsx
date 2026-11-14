import { useState } from "react";
import { useGame } from "../../stores/game";
import { MAGIC_KEYS, MAGIC_LABELS, STAT_LABELS, type StatKey } from "../../schemas";
import { CATEGORY_DEFS } from "../../game/growth/rules";
import { Panel } from "../../components/ui";

const TABS = [
  { id: "timeline", label: "成長年表" },
  { id: "magic", label: "魔法図鑑" },
  { id: "creatures", label: "魔法生物図鑑" },
  { id: "explore", label: "探索記録" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Timeline() {
  const { experiences, history } = useGame();
  const applied = experiences.filter((e) => e.analysisStatus === "applied").sort((a, b) => a.date.localeCompare(b.date));
  if (!applied.length) return <p className="text-sm text-arcane-300">まだ記録がありません。経験を承認すると、月ごとの年表になって残ります(消えません)。</p>;
  const levels = history.filter((h) => h.kind === "level");
  const lvByEvent = new Map(levels.map((h) => [h.eventId, h]));
  const months = new Map<string, typeof applied>();
  applied.forEach((e) => { const m = e.date.slice(0, 7); months.set(m, [...(months.get(m) ?? []), e]); });
  return (
    <ol className="space-y-5">
      {[...months.entries()].reverse().map(([m, evs]) => {
        const exp = evs.reduce((s, e) => s + (e.approvedGrowth?.exp ?? 0), 0);
        const st: Record<string, number> = {};
        evs.forEach((e) => Object.entries(e.approvedGrowth?.stats ?? {}).forEach(([k, v]) => { st[k] = (st[k] ?? 0) + v; }));
        const top = Object.entries(st).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const lvs = evs.map((e) => lvByEvent.get(e.id)).filter(Boolean);
        return (
          <li key={m} className="rounded-xl border border-gold-500/20 bg-night-800/40 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg text-gold-200">{m.replace("-", "年 ")}月</p>
              <p className="num text-xs text-arcane-300">経験 {evs.length}件 ・ EXP +{exp}</p>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {lvs.map((h) => <span key={h!.id} className="pill num bg-arcane-500/25 text-arcane-300">Lv.{h!.before}→{h!.after}</span>)}
              {top.map(([k, v]) => <span key={k} className="pill num bg-gold-500/15 text-gold-200">{STAT_LABELS[k as StatKey].name} +{Math.round(v * 10) / 10}</span>)}
            </div>
            <ul className="mt-2 space-y-0.5 text-sm">
              {evs.map((e) => <li key={e.id} className="flex gap-2"><span className="num shrink-0 text-xs text-arcane-300/70">{e.date.slice(5)}</span><span className="truncate">{e.title}</span><span className="ml-auto shrink-0 text-[11px] text-arcane-300/60">{CATEGORY_DEFS[e.category].label}</span></li>)}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function MagicBook() {
  const { character: ch } = useGame();
  if (!ch) return null;
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MAGIC_KEYS.map((k) => (
          <li key={k} className="rounded-xl border border-arcane-500/25 p-3">
            <p className="font-serif text-lg text-gold-200">{MAGIC_LABELS[k].name}</p>
            <p className="text-sm text-arcane-300">{MAGIC_LABELS[k].desc}</p>
            <p className="num mt-1 text-xs text-arcane-300/80">適性:{ch.magicAffinity[k].value ?? "未診断"} ・ 経験から見えた兆し {ch.magicAffinity[k].signals.toFixed(1)}</p>
          </li>
        ))}
      </ul>
      <div className="rounded-xl bg-night-800/50 p-3">
        <p className="label mb-1">習得した魔法</p>
        {ch.learnedSpells.length
          ? <ul className="flex flex-wrap gap-1.5">{ch.learnedSpells.map((s) => <li key={s} className="pill bg-gold-500/15 text-gold-200">{s}</li>)}</ul>
          : <p className="text-sm text-arcane-300">まだ習得した魔法はない。魔法の習得は Phase 4 で始まります。</p>}
      </div>
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div className="grid place-items-center gap-2 py-10 text-center">
    <span className="font-serif text-5xl text-arcane-300/30" aria-hidden="true">？</span>
    <p className="max-w-sm text-sm text-arcane-300">{text}</p>
  </div>
);

export default function EncyclopediaPage() {
  const [tab, setTab] = useState<Tab>("timeline");
  return (
    <Panel title="図鑑 ・ 星辰の大図書館">
      <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="図鑑の種類">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${tab === t.id ? "bg-gold-500/20 text-gold-200" : "text-arcane-300 hover:text-gold-200"}`}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "timeline" && <Timeline />}
        {tab === "magic" && <MagicBook />}
        {tab === "creatures" && <Empty text="まだ出会った魔法生物はいない。魔法生物保護区がひらく Phase 5 から記録されます。" />}
        {tab === "explore" && <Empty text="まだ探索の記録はない。古代遺跡や禁書庫の探索は Phase 4 から始まります。" />}
      </div>
    </Panel>
  );
}
