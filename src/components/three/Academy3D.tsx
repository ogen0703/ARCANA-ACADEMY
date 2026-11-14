import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { hasWebGL } from "./webgl";
import { ambienceOf } from "../../game/world/ambience";
import { HeroSilhouette, MagicCircle } from "../ui";
import { ART } from "../../game/world/art";
import { useImageReady } from "./useImageReady";
import ArtScene from "./ArtScene";

// three.js は重いので、必要になったときにだけ読み込む(最初の表示を速くするため)
const AcademyScene = lazy(() => import("./AcademyScene"));

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* 3Dが動かない端末は2D表示にする */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Fallback({ mode, className }: { mode: "hall" | "portrait"; className: string }) {
  return (
    <div className={`relative grid place-items-center ${className}`} data-testid="scene-fallback">
      <MagicCircle className={`absolute text-gold-400/60 ${mode === "hall" ? "h-[280px] w-[280px]" : "h-full w-full"}`} />
      <HeroSilhouette className={mode === "hall" ? "relative h-[230px]" : "relative h-[85%]"} />
    </div>
  );
}

/** 時間帯は1分ごとに見直す */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  return now;
}

export default function Academy3D({ mode = "hall", burst = 0, className = "" }: { mode?: "hall" | "portrait"; burst?: number; className?: string }) {
  const now = useNow();
  const a = ambienceOf(now);
  const fb = <Fallback mode={mode} className={className} />;
  // 一枚絵(背景と立ち絵)がそろっていれば、それを主役にする
  const bg = useImageReady(ART.hall[a.time]), hero = useImageReady(ART.hero);
  if (bg === "ok" && hero === "ok") return <ArtScene time={a.time} season={a.season} weather={a.weather} mode={mode} burst={burst} className={className} />;
  if (bg === "loading" || hero === "loading") return <div className={`bg-night-950 ${className}`} />;
  if (!hasWebGL()) return fb;
  return (
    <Boundary fallback={fb}>
      <Suspense fallback={<div className={`grid place-items-center ${className}`}><p className="text-xs text-arcane-300">学院を描いています…</p></div>}>
        <AcademyScene time={a.time} season={a.season} weather={a.weather} mode={mode} burst={burst} className={className} />
      </Suspense>
    </Boundary>
  );
}
