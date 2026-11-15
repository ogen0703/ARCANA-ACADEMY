import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGame } from "../../stores/game";
import { SPELL_FX, ctxOf, fxLabel, hint, opponentById, startBattle, step, storyOpen, unlocked, type Command, type State } from "../../game/academy/battle";
import { magicName } from "../../game/academy/compound";
import { materialById } from "../../game/academy/explore";
import { finishBattle } from "../../services/storage/repo";
import { Bar, Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

type Done = Awaited<ReturnType<typeof finishBattle>>;
export default function BattlePage() {
  const { opp = "" } = useParams();
  const { character: ch, run } = useGame();
  const o = opponentById(opp);
  const ctx = useMemo(() => (ch ? ctxOf(ch) : null), [ch?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const seed = useRef(Math.floor(Math.random() * 1e9));
  const [cmds, setCmds] = useState<Command[]>([]);
  const [st, setSt] = useState<State | null>(() => (ctx && o ? startBattle(ctx, o.id, seed.current) : null));
  const [hit, setHit] = useState(0);
  const [done, setDone] = useState<Done | null>(null);
  const [err, setErr] = useState("");
  if (!ch || !ctx) return null;
  if (!o || !st) return <Panel title="決闘演習場"><p className="text-sm">その相手はいません。<Link to="/arena" className="text-candle">演習場へ</Link></p></Panel>;
  if (!unlocked(ch.world.defeated, o.id, storyOpen(ch)) && !done) return <Panel title={o.name}><p className="text-sm">まだ挑めない相手です。<Link to="/arena" className="text-candle">演習場へ</Link></p></Panel>;

  const act = async (cmd: Command) => {
    setErr("");
    try {
      const next = step(st, ctx, cmd); const list = [...cmds, cmd];
      setSt(next); setCmds(list); setHit((h) => h + 1);
      if (next.over) { let r: Done | null = null; await run(async () => { r = await finishBattle(o.id, seed.current, list); }); setDone(r); }
    } catch (e) { setErr(e instanceof Error ? e.message : "うまくいきませんでした"); }
  };
  const h = hint(st, ctx);
  return (
    <div className="mx-auto grid max-w-xl gap-3">
      <div className="panel relative overflow-hidden p-3">
        <div className="absolute inset-0 bg-cover bg-center opacity-45" style={{ backgroundImage: `url(${ART.arena})` }} />
        <div className="relative flex items-end gap-3">
          <div key={hit} className={`h-44 w-32 shrink-0 sm:h-52 sm:w-40 ${hit ? "battle-hit" : ""}`}>
            <img key={o.id} src={ART.foe(o.id)} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-full w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg text-gold-200">{o.name}</p>
            <div className="flex items-center gap-2 text-xs"><span className="w-8">体力</span><div className="flex-1"><Bar value={st.foe.hp} max={st.foe.max} tone="arcane" /></div><span className="num w-12 text-right" data-testid="foe-hp">{st.foe.hp}/{st.foe.max}</span></div>
            <p className="mt-1 flex flex-wrap gap-1 text-[10px]">
              {st.foe.shell && <span className="pill bg-night-800">硬い殻</span>}{st.foe.charged && <span className="pill bg-candle/20 text-candle">力をためた</span>}
              {st.foe.weak > 0 && <span className="pill bg-arcane-500/20">勢い半分</span>}{st.foe.vines > 0 && <span className="pill bg-night-800">つる草</span>}{st.foe.netted && <span className="pill bg-night-800">光の網</span>}
            </p>
          </div>
        </div>
        {!st.over && <p className="relative mt-2 rounded-lg bg-night-950/70 px-2 py-1 text-xs" data-testid="hint">気配:{h.text.join(" → ")}{!h.clear && <span className="text-arcane-300/60">(感受性が上がるとはっきりわかる)</span>}</p>}
      </div>

      <Panel title={`ターン ${Math.min(st.turn, 10)}`}>
        <div className="grid gap-1 text-xs">
          {[["体力", st.me.hp, st.max.hp, "gold"], ["魔力", st.me.mp, st.max.mp, "arcane"], ["精神力", st.me.sp, st.max.sp, "arcane"]].map(([l, v, m, t]) => (
            <div key={l as string} className="flex items-center gap-2"><span className="w-12">{l}</span><div className="flex-1"><Bar value={v as number} max={m as number} tone={t as "gold"} /></div><span className="num w-12 text-right" data-testid={`me-${l}`}>{v}/{m}</span></div>
          ))}
          {(st.buff.shield > 0 || st.buff.dodge || st.buff.mult > 1 || st.stunned) && <p className="flex flex-wrap gap-1 text-[10px]">{st.buff.shield > 0 && <span className="pill bg-night-800">盾</span>}{st.buff.dodge && <span className="pill bg-night-800">見切り</span>}{st.buff.mult > 1 && <span className="pill bg-night-800">弱点照射</span>}{st.stunned && <span className="pill bg-candle/20 text-candle">心が揺れている</span>}</p>}
        </div>
        {!st.over ? (
          <div className="mt-3 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              {ctx.spells.map((id) => (
                <button key={id} disabled={st.me.mp < SPELL_FX[id].mp} onClick={() => act({ type: "spell", id })} className="rounded-lg border border-gold-500/40 px-2 py-1.5 text-left text-xs hover:bg-gold-500/10 disabled:opacity-40">
                  <span className="text-gold-200">{magicName(id)}</span> <span className="num text-arcane-300">魔力{SPELL_FX[id].mp}</span><span className="block text-[10px] text-arcane-300/80">{fxLabel(id)}</span>
                </button>
              ))}
            </div>
            {ctx.awaken && <button data-testid="awaken" className="rounded-lg border border-gold-300 bg-gold-500/20 px-2 py-1.5 text-left text-xs disabled:opacity-40" disabled={!!st.awakenUsed} onClick={() => act({ type: "awaken" })}><span className="text-gold-200">✦ 星継ぎの覚醒</span> <span className="text-[10px] text-arcane-300">{st.awaken ? `(あと${st.awaken}ターン)` : st.awakenUsed ? "(この戦闘ではもう使った)" : "3ターン、呪文の魔力半分・威力1.5倍"}</span></button>}
            {ctx.companion && <button className="rounded-lg border border-gold-400/50 bg-gold-500/10 px-2 py-1.5 text-left text-xs disabled:opacity-40" disabled={!!st.companionUsed} onClick={() => act({ type: "companion" })}><span className="text-gold-200">相棒:{ctx.companion.name}</span> <span className="text-[10px] text-arcane-300">{st.companionUsed ? "(この戦闘ではもう手伝った)" : `${ctx.companion.label}${ctx.companion.mult > 1 ? ` ×${ctx.companion.mult}` : ""}`}</span></button>}
            <div className="grid grid-cols-3 gap-2">
              <button className="btn px-2 py-1.5 text-xs" onClick={() => act({ type: "staff" })}>{ch.history.wand ? "杖で打つ" : "杖で打つ(仮の杖)"}</button>
              <button className="btn px-2 py-1.5 text-xs" onClick={() => act({ type: "guard" })}>構える</button>
              <button className="btn-ghost rounded-lg px-2 py-1.5 text-xs text-arcane-300" onClick={() => act({ type: "retreat" })}>退く</button>
            </div>
            {!ctx.spells.length && <p className="text-[11px] text-arcane-300/70">呪文は講義棟の授業で覚えられる。</p>}
            {err && <p className="text-sm text-candle">{err}</p>}
          </div>
        ) : (
          <div className="mt-3 text-center" data-testid="battle-result">
            <p className="font-serif text-2xl text-gold-200">{({ win: "勝利!", lose: "敗北", draw: "引き分け", retreat: "退いた" } as const)[st.over]}</p>
            {done?.rewarded && <ul className="mt-2 flex flex-wrap justify-center gap-2"><li className="pill num bg-arcane-500/20 text-arcane-300">EXP +{done.exp}</li>{Object.entries(done.items).map(([k, v]) => <li key={k} className="pill bg-gold-500/15 text-gold-200">{materialById(k)?.name} ×{v}</li>)}</ul>}
            {done && st.over === "win" && !done.rewarded && <p className="text-xs text-arcane-300">今日の報酬はもう受け取った(練習試合)</p>}
            {done?.titles.map((t) => <p key={t} className="mt-1 text-sm text-gold-200">✧ 称号「{t}」</p>)}
            {st.over === "lose" && <p className="mt-2 text-sm">フォルトナー先生「{o.id === "golem" || o.id === "teacher" ? "硬い殻には、まず解く手を。" : o.id === "shadow" || o.id === "echo" ? "心が揺れたら、整えてから動け。" : "構えるのも立派な一手だ。"}もう一本」</p>}
            <div className="mt-3 flex justify-center gap-2"><Link to="/arena" className="btn btn-primary">演習場へ</Link><button className="btn" onClick={() => location.reload()}>もう一度</button></div>
          </div>
        )}
      </Panel>
      <Panel title="記録"><ol className="max-h-48 space-y-0.5 overflow-auto text-xs text-arcane-300" data-testid="battle-log">{[...st.log].reverse().map((l, i) => <li key={i}>{l}</li>)}</ol></Panel>
    </div>
  );
}
