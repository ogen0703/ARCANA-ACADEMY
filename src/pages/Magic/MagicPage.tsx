import { useGame } from "../../stores/game";
import { MAGIC_KEYS, MAGIC_LABELS } from "../../schemas";
import { Bar, Panel } from "../../components/ui";

const CONDITIONS = ["授業の受講", "魔法研究", "探索での発見", "魔法生物との交流", "特定の経験", "物語上の選択", "能力値の条件達成"];

export default function MagicPage() {
  const { character: ch } = useGame();
  if (!ch) return null;
  const maxSig = Math.max(1, ...MAGIC_KEYS.map((k) => ch.magicAffinity[k].signals));
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel title="魔法系統と適性">
        <p className="mb-3 text-sm text-arcane-300">魔法適性は初期診断(Phase 3)で決まり、そのあとも成長で変わっていきます。今は、経験から見えてきた「兆し」を記録しています。</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MAGIC_KEYS.map((k) => (
            <li key={k} className="rounded-xl border border-gold-500/20 bg-night-800/50 p-3">
              <p className="font-serif text-gold-200">{MAGIC_LABELS[k].name}</p>
              <p className="text-xs text-arcane-300">{MAGIC_LABELS[k].desc}</p>
              <div className="mt-2 flex items-center justify-between text-xs"><span>適性:{ch.magicAffinity[k].value ?? "未診断"}</span><span className="num text-arcane-300">兆し {ch.magicAffinity[k].signals.toFixed(1)}</span></div>
              <div className="mt-1"><Bar value={ch.magicAffinity[k].signals} max={maxSig} tone="arcane" /></div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-arcane-300/70">複数の系統を組み合わせた複合魔法は Phase 5 で登場します。</p>
      </Panel>
      <div className="grid content-start gap-4">
        <Panel title="習得した魔法">
          {ch.learnedSpells.length ? <ul>{ch.learnedSpells.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-sm text-arcane-300">まだありません。魔法の授業や研究は Phase 4 で始まります。</p>}
        </Panel>
        <Panel title="魔法を覚える方法">
          <ul className="grid gap-1 text-sm">{CONDITIONS.map((c) => <li key={c} className="flex gap-2"><span className="text-gold-400">✧</span>{c}</li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}
