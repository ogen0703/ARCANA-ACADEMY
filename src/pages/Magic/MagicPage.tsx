import { Link } from "react-router-dom";
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
        {ch.diagnosedAt
          ? <p className="mb-3 text-sm text-arcane-300">適性は入学診断の結果を出発点に、経験から見えた「兆し」で育っていきます。</p>
          : <div className="mb-3 rounded-xl bg-candle/10 p-3 text-sm"><p>まだ入学診断を受けていません。6つの問いに答えると、魔法適性の出発点が決まります。</p><Link to="/diagnosis" className="btn btn-primary mt-2 inline-block">入学診断を受ける</Link></div>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {MAGIC_KEYS.map((k) => (
            <li key={k} className="rounded-xl border border-gold-500/20 bg-night-800/50 p-3">
              <p className="font-serif text-gold-200">{MAGIC_LABELS[k].name}</p>
              <p className="text-xs text-arcane-300">{MAGIC_LABELS[k].desc}</p>
              <div className="mt-2 flex items-center justify-between text-xs"><span>適性 <span className="num text-base text-gold-200">{ch.magicAffinity[k].value ?? "未診断"}</span></span><span className="num text-arcane-300">{ch.magicAffinity[k].base != null && `診断 ${ch.magicAffinity[k].base} ・ `}兆し {ch.magicAffinity[k].signals.toFixed(1)}</span></div>
              <div className="mt-1">{ch.magicAffinity[k].value != null ? <Bar value={ch.magicAffinity[k].value!} /> : <Bar value={ch.magicAffinity[k].signals} max={maxSig} tone="arcane" />}</div>
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
