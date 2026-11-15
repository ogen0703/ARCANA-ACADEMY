import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ART, FLOOR, HALL_ASPECT, HERO_LAYOUT } from "../../game/world/art";
import type { SeasonKey, TimeKey, WeatherKey } from "../../game/world/ambience";
import { hasWebGL, prefersReducedMotion } from "./webgl";
import FallbackImg from "../FallbackImg";
import type { auraOf, circleOf, orbOf } from "../../game/growth/appearance";

/** 見た目の進化(Phase 5b):オーラ・杖の光・床の魔法陣・相棒 */
export type Look = { aura: ReturnType<typeof auraOf>; orb: ReturnType<typeof orbOf>; circle: ReturnType<typeof circleOf>; companion: { id: string; stage: number } | null };
const AURA_OPACITY = [0.2, 0.34, 0.5, 0.65];

/** 床に寝かせた魔法陣(系統ごとの輪と、呪文の数だけ細かくなる紋様) */
function FloorRings({ circle }: { circle: Look["circle"] }) {
  if (!circle.rings.length) return null;
  const n = circle.detail;
  return (
    <svg viewBox="-150 -50 300 100" className="art-rings pointer-events-none absolute" style={{ left: `${FLOOR.x * 100}%`, top: `${FLOOR.y * 100}%`, width: `${FLOOR.widthPct * 0.92}%` }} aria-hidden="true" data-testid="floor-rings">
      {circle.rings.map((r, i) => { const rx = 140 - i * 15, ry = rx / 3; return <ellipse key={r.k} rx={rx} ry={ry} fill="none" stroke={r.color} strokeWidth={i === 0 ? 1.6 : 1} strokeOpacity={0.85} />; })}
      {Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2, rx = 140, ry = rx / 3; return <circle key={i} cx={Math.cos(t) * rx} cy={Math.sin(t) * ry} r={1.6} fill={circle.rings[i % circle.rings.length].color} />; })}
      {Array.from({ length: 7 }, (_, i) => { const t = (i / 7) * Math.PI * 2 - Math.PI / 2, rx = 60, ry = 20, u = ((i + 3) / 7) * Math.PI * 2 - Math.PI / 2; return <line key={i} x1={Math.cos(t) * rx} y1={Math.sin(t) * ry} x2={Math.cos(u) * rx} y2={Math.sin(u) * ry} stroke={circle.rings[0].color} strokeWidth={0.8} strokeOpacity={0.7} />; })}
    </svg>
  );
}

const EffectsLayer = lazy(() => import("./EffectsLayer"));

type Props = { time: TimeKey; season: SeasonKey; weather: WeatherKey; mode: "hall" | "portrait"; burst: number; className?: string; heroSrc?: string; orbPos?: { x: number; y: number }; heroAspect?: number; look?: Look };

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
export default function ArtScene({ time, season, weather, mode, burst, className = "", heroSrc = ART.hero, orbPos = HERO_LAYOUT.orb, heroAspect = 0.405, look }: Props) {
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
        {!portrait && look && <FloorRings circle={look.circle} />}
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
          {/* オーラ(いちばん高い魔法適性の色) */}
          {look && look.aura.colors.length > 0 && (
            <span className="art-aura pointer-events-none absolute -inset-x-[30%] -inset-y-[6%]" data-testid="aura" style={{ opacity: AURA_OPACITY[look.aura.level],
              background: look.aura.colors.length > 1
                ? `radial-gradient(ellipse 50% 50% at 40% 50%, ${look.aura.colors[0]} 50%, transparent 100%), radial-gradient(ellipse 50% 50% at 60% 50%, ${look.aura.colors[1]} 50%, transparent 100%)`
                : `radial-gradient(ellipse 50% 50% at 50% 50%, ${look.aura.colors[0]} 52%, transparent 100%)` }} />
          )}
          <img src={heroSrc} alt="" draggable={false} className={`relative h-full w-auto max-w-none select-none ${flash ? "art-hero-burst" : ""}`} />
          <span className="art-orb pointer-events-none absolute" style={{ left: `${orbPos.x * 100}%`, top: `${orbPos.y * 100}%`, ...(look ? { background: `radial-gradient(circle, rgba(255,246,220,.95), ${look.orb.color}aa 35%, transparent 70%)`, width: 46 * look.orb.scale, height: 46 * look.orb.scale, margin: -23 * look.orb.scale } : {}) }} />
        </div>
      </div>
      {/* 相棒(主人公の足もと) */}
      {!portrait && look?.companion && (
        <div className="art-breathe pointer-events-none absolute" data-testid="hall-companion"
          style={{ left: Math.min(stage.left + stage.w * H.x + heroH * Math.min(heroAspect / 2 + 0.1, 0.34), (box.current?.clientWidth ?? 9999) - heroH * 0.12), top: stage.top + stage.h * H.feetY - heroH * 0.3, height: heroH * 0.3, transform: `translate3d(calc(-50% + ${par.x * 6}px), ${par.y * 3}px, 0)` }}>
          <FallbackImg srcs={ART.creature(look.companion.id, look.companion.stage)} className="h-full w-auto max-w-none select-none drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]" />
        </div>
      )}
      {/* 周辺を暗く(映画のような締まり) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgba(5,4,12,0.7))]" />
      {weather === "mist" && <div className="art-mist pointer-events-none absolute inset-x-0 bottom-0 h-1/2" />}
    </div>
  );
}
