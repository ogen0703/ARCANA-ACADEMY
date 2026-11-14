import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { ART, FLOOR, HERO_LAYOUT } from "../../game/world/art";
import type { SeasonKey, TimeKey, WeatherKey } from "../../game/world/ambience";
import { hasWebGL, prefersReducedMotion } from "./webgl";

const EffectsLayer = lazy(() => import("./EffectsLayer"));

type Props = { time: TimeKey; season: SeasonKey; weather: WeatherKey; mode: "hall" | "portrait"; burst: number; className?: string };

/**
 * 一枚絵の学院+主人公の立ち絵に、光の演出を重ねた表示。
 * 指でなぞると少しだけ奥行き(視差)が動く。主人公は呼吸するように揺れ、杖の光がまたたく。
 */
export default function ArtScene({ time, season, weather, mode, burst, className = "" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });
  const [flash, setFlash] = useState(false);
  const first = useRef(burst);
  useEffect(() => {
    if (burst === first.current) return;
    setFlash(true); const t = setTimeout(() => setFlash(false), 2200); return () => clearTimeout(t);
  }, [burst]);
  const reduce = prefersReducedMotion();
  const move = (cx: number, cy: number) => {
    if (reduce || !box.current) return;
    const r = box.current.getBoundingClientRect();
    setPar({ x: ((cx - r.left) / r.width - 0.5) * 2, y: ((cy - r.top) / r.height - 0.5) * 2 });
  };
  const bgShift = `translate3d(${-par.x * 10}px, ${-par.y * 6}px, 0) scale(1.08)`;
  const heroShift = `translate3d(calc(-50% + ${par.x * 6}px), ${par.y * 3}px, 0)`;
  const portrait = mode === "portrait";
  return (
    <div ref={box} className={`relative overflow-hidden bg-night-950 ${className}`} style={{ touchAction: "pan-y" }}
      onPointerMove={(e) => move(e.clientX, e.clientY)} onPointerLeave={() => setPar({ x: 0, y: 0 })}
      role="img" aria-label="アルカナ学院の大広間に立つ主人公" data-testid="art-scene">
      {/* 背景(時間帯ごとの一枚絵) */}
      <img src={ART.hall[time]} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-300 ease-out"
        style={{ transform: bgShift, objectPosition: portrait ? "50% 70%" : "50% 55%", filter: portrait ? "blur(1.5px) brightness(.7)" : undefined }} />
      {/* 床の魔法陣の光(承認・レベルアップで強く光る) */}
      <div className={`art-floor pointer-events-none absolute ${flash ? "art-floor-burst" : ""}`}
        style={{ left: `${FLOOR.x * 100}%`, top: `${(portrait ? 0.93 : FLOOR.y) * 100}%`, width: `${portrait ? 120 : FLOOR.widthPct}%` }} />
      {/* ろうそくの揺らぎ(画面全体の暖色の明滅) */}
      <div className="art-candle pointer-events-none absolute inset-0" style={{ opacity: time === "night" || time === "dusk" ? 1 : 0.45 }} />
      {/* 季節の粒子 */}
      {hasWebGL() && !reduce && (
        <div className="pointer-events-none absolute inset-0">
          <Suspense fallback={null}><EffectsLayer season={season} weather={weather} burst={burst} circle={false} /></Suspense>
        </div>
      )}
      {/* 主人公 */}
      <div className="absolute left-1/2 transition-transform duration-300 ease-out" style={{ bottom: `${portrait ? 0 : HERO_LAYOUT.bottomPct}%`, height: `${portrait ? 98 : HERO_LAYOUT.heightPct}%`, transform: heroShift }}>
        <div className="art-breathe relative h-full">
          <img src={ART.hero} alt="" draggable={false} className="h-full w-auto select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]" />
          <span className="art-orb pointer-events-none absolute" style={{ left: `${HERO_LAYOUT.orb.x * 100}%`, top: `${HERO_LAYOUT.orb.y * 100}%` }} />
        </div>
      </div>
      {/* 周辺を暗く(映画のような締まり) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgba(5,4,12,0.75))]" />
      {weather === "mist" && <div className="art-mist pointer-events-none absolute inset-x-0 bottom-0 h-1/2" />}
    </div>
  );
}
