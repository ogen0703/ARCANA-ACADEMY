import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ART, FLOOR, HALL_ASPECT, HERO_LAYOUT } from "../../game/world/art";
import type { SeasonKey, TimeKey, WeatherKey } from "../../game/world/ambience";
import { hasWebGL, prefersReducedMotion } from "./webgl";

const EffectsLayer = lazy(() => import("./EffectsLayer"));

type Props = { time: TimeKey; season: SeasonKey; weather: WeatherKey; mode: "hall" | "portrait"; burst: number; className?: string };

/** 枠いっぱいに広間の絵を敷く(はみ出す部分は切る)。主人公や光は絵の上の位置で置くので、画面の形が変わってもずれない */
function useStage(box: React.RefObject<HTMLDivElement>, focusY: number) {
  const [st, setSt] = useState({ w: 0, h: 0, left: 0, top: 0 });
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => {
      const cw = el.clientWidth, ch = el.clientHeight;
      const w = Math.max(cw, ch * HALL_ASPECT) * 1.06, h = w / HALL_ASPECT; // 少し大きめ(視差で端が見えないように)
      setSt({ w, h, left: (cw - w) / 2, top: Math.min(0, Math.max(ch - h, ch / 2 - h * focusY)) });
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [box, focusY]);
  return st;
}

/**
 * 一枚絵の学院+主人公の立ち絵に、光の演出を重ねた表示。
 * 指でなぞると少しだけ奥行き(視差)が動く。主人公は呼吸するように揺れ、杖の光がまたたく。
 */
export default function ArtScene({ time, season, weather, mode, burst, className = "" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const portrait = mode === "portrait";
  const stage = useStage(box, portrait ? 0.62 : 0.6);
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
  const H = HERO_LAYOUT;
  const heroH = portrait ? (box.current?.clientHeight ?? 200) * 0.96 : stage.h * (H.heightPct / 100);
  return (
    <div ref={box} className={`relative overflow-hidden bg-night-950 ${className}`} style={{ touchAction: "pan-y" }}
      onPointerMove={(e) => move(e.clientX, e.clientY)} onPointerLeave={() => setPar({ x: 0, y: 0 })}
      role="img" aria-label="アルカナ学院の大広間に立つ主人公" data-testid="art-scene">
      {/* 背景(時間帯ごとの一枚絵)と床の光 */}
      <div className="absolute transition-transform duration-300 ease-out" style={{ left: stage.left, top: stage.top, width: stage.w, height: stage.h, transform: `translate3d(${-par.x * 8}px, ${-par.y * 5}px, 0)` }}>
        <img src={ART.hall[time]} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none"
          style={{ filter: portrait ? "blur(2px) brightness(.6)" : undefined }} />
        {!portrait && <div className={`art-floor pointer-events-none absolute ${flash ? "art-floor-burst" : ""}`} style={{ left: `${FLOOR.x * 100}%`, top: `${FLOOR.y * 100}%`, width: `${FLOOR.widthPct}%` }} />}
      </div>
      {/* ろうそくの揺らぎ */}
      <div className="art-candle pointer-events-none absolute inset-0" style={{ opacity: time === "night" || time === "dusk" ? 1 : 0.5 }} />
      {/* 季節の粒子 */}
      {hasWebGL() && !reduce && (
        <div className="pointer-events-none absolute inset-0">
          <Suspense fallback={null}><EffectsLayer season={season} weather={weather} burst={burst} circle={false} /></Suspense>
        </div>
      )}
      {/* 主人公(足元を床に合わせる) */}
      <div className="absolute transition-transform duration-300 ease-out"
        style={portrait
          ? { left: "50%", bottom: 0, height: heroH, transform: `translate3d(calc(-50% + ${par.x * 4}px), 0, 0)` }
          : { left: stage.left + stage.w * H.x, top: stage.top + stage.h * H.feetY - heroH, height: heroH, transform: `translate3d(calc(-50% + ${par.x * 5}px), ${par.y * 3}px, 0)` }}>
        <div className="art-breathe relative h-full">
          {/* 足元の影 */}
          {!portrait && <span className="pointer-events-none absolute bottom-0 left-1/2 h-[4%] w-[90%] -translate-x-1/2 translate-y-1/2 rounded-[50%] bg-black/55 blur-md" />}
          <img src={ART.hero} alt="" draggable={false} className={`relative h-full w-auto max-w-none select-none ${flash ? "art-hero-burst" : ""}`} />
          <span className="art-orb pointer-events-none absolute" style={{ left: `${H.orb.x * 100}%`, top: `${H.orb.y * 100}%` }} />
        </div>
      </div>
      {/* 周辺を暗く(映画のような締まり) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgba(5,4,12,0.7))]" />
      {weather === "mist" && <div className="art-mist pointer-events-none absolute inset-x-0 bottom-0 h-1/2" />}
    </div>
  );
}
