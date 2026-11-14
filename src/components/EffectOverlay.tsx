import { useEffect } from "react";
import { useGame } from "../stores/game";
import { STAT_LABELS, type StatKey } from "../schemas";
import { MagicCircle } from "./ui";

/** 成長を反映したとき・レベルが上がったときの魔法の演出 */
export default function EffectOverlay() {
  const { effect, clearEffect } = useGame();
  useEffect(() => {
    if (!effect) return;
    const t = setTimeout(clearEffect, effect.kind === "level" ? 4200 : 2800);
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
          {lv ? (
            <>
              <p className="font-display text-sm tracking-[0.4em] text-gold-300">LEVEL UP</p>
              <p className="num font-display text-6xl text-gold-200 drop-shadow-[0_0_18px_rgba(244,214,140,0.7)]">Lv.{effect.levelTo}</p>
              <p className="mt-1 text-sm text-arcane-300">Lv.{effect.levelFrom} → Lv.{effect.levelTo}</p>
            </>
          ) : (
            <p className="font-serif text-2xl text-gold-200">成長が刻まれた</p>
          )}
          <p className="mt-2 max-w-[18em] truncate text-sm text-[#e9e4f7]">{effect.title}</p>
          <ul className="mt-2 flex max-w-[20em] flex-wrap justify-center gap-1.5">
            {Object.entries(effect.stats).filter(([, v]) => v > 0).map(([k, v]) => <li key={k} className="pill num bg-gold-500/20 text-gold-200">{STAT_LABELS[k as StatKey]?.name ?? k} +{v}</li>)}
            <li className="pill num bg-arcane-500/25 text-arcane-300">EXP +{effect.exp}</li>
          </ul>
          <p className="mt-3 text-[11px] text-arcane-300/60">タップで閉じる</p>
        </div>
      </div>
    </div>
  );
}
