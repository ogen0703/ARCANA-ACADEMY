import { Canvas } from "@react-three/fiber";
import { FloorCircle, Particles } from "./AcademyScene";
import type { SeasonKey, WeatherKey } from "../../game/world/ambience";

/** 一枚絵の上に重ねる3Dの光(床の魔法陣と季節の粒子)。背景は透明 */
export default function EffectsLayer({ season, weather, burst, circle = true }: { season: SeasonKey; weather: WeatherKey; burst: number; circle?: boolean }) {
  return (
    <Canvas dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} camera={{ fov: 42, near: 0.1, far: 40, position: [0, 2.6, 4.6] }}
      onCreated={({ camera }) => camera.lookAt(0, 0.9, 0)} style={{ pointerEvents: "none" }}>
      {circle && <FloorCircle burst={burst} />}
      <Particles season={season} weather={weather} count={140} />
    </Canvas>
  );
}
