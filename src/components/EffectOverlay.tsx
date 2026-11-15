import { useEffect } from "react";
import { useGame } from "../stores/game";
import { STAT_LABELS, type StatKey } from "../schemas";
import { MagicCircle } from "./ui";
import { rankOf } from "../game/growth/appearance";
import FallbackImg from "./FallbackImg";
import { ART } from "../game/world/art";

const RANK_KEY = "arcana-rank-seen";
/** 位が上がったら昇格の演出を出す(前に見た位は端末に覚えておく。読めなくても表示は壊さない) */
function useRankWatch() {
  const ch = useGame((s) => s.character);
  const rank = ch ? rankOf(ch) : null;
  useEffect(() => {
    if (!rank || !ch) return;
    let seen: number | null = null;
    try { const v = localStorage.getItem(RANK_KEY); seen = v == null ? null : Number(v); } catch { return; }
    try { localStorage.setItem(RANK_KEY, String(rank.index)); } catch { /* 任意 */ }
    if (seen != null && rank.index > seen) useGame.setState((s) => ({ burst: s.burst + 1, effect: { id: Date.now(), kind: "rank", title: `${rank.name}に昇格`, stats: {}, exp: 0, levelFrom: ch.level, levelTo: ch.level } }));
  }, [rank?.index]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** 成長を反映したとき・レベルが上がったときの魔法の演出 */
export default function EffectOverlay() {
  const { effect, clearEffect } = useGame();
  useRankWatch();
  useEffect(() => {
    if (!effect) return;
    const t = setTimeout(clearEffect, effect.kind === "growth" ? 2800 : effect.kind === "awaken" ? 6000 : 4200);
    return () => clearTimeout(t);
  }, [effect, clearEffect]);
  if (!effect) return null;
  const lv = effect.kind === "level";
  return (
    <div className="fx-root fixed inset-0 z-50 grid place-items-center bg-night-950/70 backdrop-blur-[2px]" onClick={clearEffect} role="status" aria-live="polite" data-testid="effect-overlay">
      <div className="relative grid place-items-center text-center">
        <MagicCircle className={`fx-circle absolute h-[340px] w-[340px] ${lv ? "text-gold-300" : "text-arcane-300"}`} />
        <div className="fx-sparks pointer-events-none absolute h-[340px] w-[340px]" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => <span key={i} style={{ ["--a" as string]: `${(i / 14) * 360}deg`, animationDelay: `${(i % 4) * 0.06}s` }} />)}
        </div>
        <div className="fx-text relative px-6">
          {effect.kind === "awaken" ? (
            <>
              <div className="relative mx-auto h-64 w-40"><FallbackImg srcs={[ART.awakened]} className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(244,214,140,0.6)]" /></div>
              <p className="font-display text-sm tracking-[0.4em] text-gold-300">AWAKENING</p>
              <p className="font-serif text-3xl text-gold-200 drop-shadow-[0_0_18px_rgba(244,214,140,0.7)]">星継ぎの覚醒</p>
              <p className="mt-1 text-sm text-arcane-300">七つ星の仔と心が重なった。七つ星の仔が仲間になった</p>
            </>
          ) : effect.kind === "rank" ? (
            <>
              <p className="font-display text-sm tracking-[0.4em] text-gold-300">PROMOTION</p>
              <p className="font-serif text-4xl text-gold-200 drop-shadow-[0_0_18px_rgba(244,214,140,0.7)]">{effect.title.replace("に昇格", "")}</p>
              <p className="mt-1 text-sm text-arcane-300">昇格した。大広間で新しい姿を見てみよう</p>
            </>
          ) : effect.kind === "spell" ? (
            <>
              <p className="font-display text-sm tracking-[0.4em] text-gold-300">NEW SPELL</p>
              <p className="font-serif text-3xl text-gold-200 drop-shadow-[0_0_18px_rgba(244,214,140,0.7)]">{effect.spells?.join(" ・ ")}</p>
              <p className="mt-1 text-sm text-arcane-300">新しい呪文を覚えた</p>
            </>
          ) : lv ? (
            <>
              <p className="font-display text-sm tracking-[0.4em] text-gold-300">LEVEL UP</p>
              <p className="num font-display text-6xl text-gold-200 drop-shadow-[0_0_18px_rgba(244,214,140,0.7)]">Lv.{effect.levelTo}</p>
              <p className="mt-1 text-sm text-arcane-300">Lv.{effect.levelFrom} → Lv.{effect.levelTo}</p>
            </>
          ) : (
            <p className="font-serif text-2xl text-gold-200">成長が刻まれた</p>
          )}
          {effect.kind !== "spell" && effect.kind !== "rank" && effect.kind !== "awaken" && <p className="mt-2 max-w-[18em] truncate text-sm text-[#e9e4f7]">{effect.title}</p>}
          {effect.kind !== "spell" && !!effect.spells?.length && <p className="mt-2 text-sm text-gold-200">✧ 新しい呪文「{effect.spells.join("」「")}」を覚えた</p>}
          <ul className="mt-2 flex max-w-[20em] flex-wrap justify-center gap-1.5">
            {Object.entries(effect.stats).filter(([, v]) => v > 0).map(([k, v]) => <li key={k} className="pill num bg-gold-500/20 text-gold-200">{STAT_LABELS[k as StatKey]?.name ?? k} +{v}</li>)}
            {effect.exp > 0 && <li className="pill num bg-arcane-500/25 text-arcane-300">EXP +{effect.exp}</li>}
          </ul>
          <p className="mt-3 text-[11px] text-arcane-300/60">タップで閉じる</p>
        </div>
      </div>
    </div>
  );
}
