import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { MAGIC_KEYS, MAGIC_LABELS } from "../../schemas";
import { Bar, Panel } from "../../components/ui";
import { SPELLS, TIER_LABELS } from "../../game/academy/content";
import { spellConditions } from "../../game/academy/engine";
import { MAGIC_LABELS as ML } from "../../schemas";

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
        <Panel title="呪文" right={<span className="num text-xs text-gold-200">{ch.learnedSpells.length} / {SPELLS.length}</span>}>
          <p className="mb-2 text-xs text-arcane-300">授業の熟練度に、中級からは現実の成長(能力値と兆し)も必要。<Link to="/lessons" className="text-candle">授業へ</Link></p>
          <ul className="grid gap-1.5" data-testid="spell-list">
            {SPELLS.map((sp) => {
              const learned = ch.learnedSpells.includes(sp.id), st = spellConditions(ch, sp);
              return (
                <li key={sp.id} data-spell={sp.id} data-learned={learned}>
                  <details className={`rounded-lg px-2 py-1.5 ${learned ? "bg-gold-500/15" : "bg-night-800/50"}`}>
                    <summary className="flex cursor-pointer items-center gap-2 text-sm">
                      <span className={learned ? "text-gold-300" : "text-arcane-300/40"}>{learned ? "✧" : "○"}</span>
                      <span className={learned ? "text-gold-200" : ""}>{sp.name}</span>
                      <span className="ml-auto text-[10px] text-arcane-300">{ML[sp.system].name} ・ {TIER_LABELS[sp.tier]}</span>
                    </summary>
                    <p className="mt-1 text-xs">{sp.effect}<span className="text-arcane-300/70">(使いどころ:{sp.use})</span></p>
                    {!learned && <ul className="mt-1 space-y-0.5 text-[11px]">{st.conds.map((c) => <li key={c.label} className={c.met ? "text-gold-200" : "text-arcane-300"}>{c.met ? "✓" : "・"} {c.label}(いま {c.now})</li>)}</ul>}
                  </details>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
