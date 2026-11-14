import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Hero from "./Hero";
import { makeMagicCircleTexture } from "./magicCircleTexture";
import { prefersReducedMotion } from "./webgl";
import { SEASON, TIME, type SeasonKey, type TimeKey, type WeatherKey } from "../../game/world/ambience";

type Props = { time: TimeKey; season: SeasonKey; weather: WeatherKey; mode?: "hall" | "portrait"; burst?: number; className?: string };

/** ドラッグで主人公を回す(縦スクロールはさまたげない) */
function useDragRotate() {
  const yaw = useRef(0), vel = useRef(0), dragging = useRef(false), lastX = useRef(0);
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => { dragging.current = true; lastX.current = e.clientX; (e.target as Element).setPointerCapture?.(e.pointerId); },
    onPointerMove: (e: React.PointerEvent) => { if (!dragging.current) return; const dx = e.clientX - lastX.current; lastX.current = e.clientX; yaw.current += dx * 0.012; vel.current = dx * 0.012; },
    onPointerUp: () => { dragging.current = false; },
    onPointerCancel: () => { dragging.current = false; },
  };
  return { yaw, vel, dragging, handlers };
}

function Candle({ position, seed }: { position: [number, number, number]; seed: number }) {
  const flame = useRef<THREE.Mesh>(null), light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 9 + seed * 13;
    const f = 0.8 + Math.sin(t) * 0.08 + Math.sin(t * 2.3) * 0.06 + Math.sin(t * 5.1) * 0.04;
    if (light.current) light.current.intensity = 1.6 * f;
    if (flame.current) flame.current.scale.set(1, f * 1.1, 1);
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.07, 0.11, 1, 10]} /><meshStandardMaterial color="#4a3a2a" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 1.08, 0]}><cylinderGeometry args={[0.045, 0.045, 0.16, 10]} /><meshStandardMaterial color="#efe4cf" roughness={0.9} /></mesh>
      <mesh ref={flame} position={[0, 1.22, 0]}><coneGeometry args={[0.03, 0.11, 8]} /><meshBasicMaterial color="#ffcf7a" toneMapped={false} /></mesh>
      <pointLight ref={light} position={[0, 1.28, 0]} color="#ffb45e" distance={4.5} decay={2} />
    </group>
  );
}

function Pillar({ angle, radius }: { angle: number; radius: number }) {
  const x = Math.sin(angle) * radius, z = -Math.cos(angle) * radius;
  return (
    <group position={[x, 0, z]} rotation={[0, -angle, 0]}>
      <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.7, 0.24, 0.7]} /><meshStandardMaterial color="#2b2640" roughness={0.9} /></mesh>
      <mesh position={[0, 2.6, 0]} castShadow><cylinderGeometry args={[0.24, 0.28, 5, 14]} /><meshStandardMaterial color="#363050" roughness={0.85} /></mesh>
      <mesh position={[0, 5.15, 0]}><boxGeometry args={[0.66, 0.2, 0.66]} /><meshStandardMaterial color="#2b2640" roughness={0.9} /></mesh>
    </group>
  );
}

/** 奥の壁:尖頭アーチの窓(時間帯で光の色が変わる) */
function GothicWindows({ color }: { color: string }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape(); const w = 0.55, h = 2.4;
    s.moveTo(-w, 0); s.lineTo(-w, h); s.quadraticCurveTo(-w, h + 0.9, 0, h + 1.25); s.quadraticCurveTo(w, h + 0.9, w, h); s.lineTo(w, 0); s.lineTo(-w, 0);
    return s;
  }, []);
  return (
    <group position={[0, 1.4, -7.6]}>
      <mesh position={[0, 1.6, -0.1]}><planeGeometry args={[18, 9]} /><meshStandardMaterial color="#1a1628" roughness={1} /></mesh>
      {[-3.2, 0, 3.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh><shapeGeometry args={[shape]} /><meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} /></mesh>
          <mesh position={[0, 1.6, 0.01]}><boxGeometry args={[0.05, 3.6, 0.02]} /><meshStandardMaterial color="#14112a" /></mesh>
          <mesh position={[0, 1.4, 0.01]}><boxGeometry args={[1.1, 0.05, 0.02]} /><meshStandardMaterial color="#14112a" /></mesh>
        </group>
      ))}
    </group>
  );
}

export function FloorCircle({ burst }: { burst: number }) {
  const tex = useMemo(() => makeMagicCircleTexture(), []);
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef(-10);
  const lastBurst = useRef(burst);
  const reduce = useMemo(prefersReducedMotion, []);
  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    if (burst !== lastBurst.current) { lastBurst.current = burst; start.current = t; }
    const b = Math.max(0, 1 - (t - start.current) / 2.2); // 承認・レベルアップ時に強く光る
    if (!ref.current) return;
    if (!reduce) ref.current.rotation.z += dt * (0.05 + b * 1.2);
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.42 + Math.sin(t * 1.4) * 0.08 + b * 0.5;
    const s = 1 + b * 0.25; ref.current.scale.set(s, s, 1);
  });
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh ref={ref} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.6, 3.6]} />
      <meshBasicMaterial map={tex} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** 季節の粒子(春:花びら色、夏:蛍、秋:落ち葉色、冬:雪)+雨 */
export function Particles({ season, weather, count = 260 }: { season: SeasonKey; weather: WeatherKey; count?: number }) {
  const def = SEASON[season];
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { const r = 1 + Math.random() * 6, a = Math.random() * Math.PI * 2; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = Math.random() * 6; p[i * 3 + 2] = Math.sin(a) * r - 1.5; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g;
  }, [count]);
  const rain = useMemo(() => {
    if (weather !== "rain") return null;
    const g = new THREE.BufferGeometry(); const n = 400; const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 16; p[i * 3 + 1] = Math.random() * 7; p[i * 3 + 2] = -7 + Math.random() * 1.2; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g;
  }, [weather]);
  const reduce = useMemo(prefersReducedMotion, []);
  const mat = useRef<THREE.PointsMaterial>(null);
  useFrame(({ clock }, dt) => {
    if (reduce) return;
    const t = clock.getElapsedTime();
    const a = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) - def.fall * dt * (0.6 + (i % 5) * 0.15);
      if (y < 0) y = 6; if (y > 6) y = 0;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(t * 0.7 + i) * dt * 0.08);
    }
    a.needsUpdate = true;
    if (mat.current && season === "summer") mat.current.opacity = 0.55 + Math.sin(t * 3) * 0.35; // 蛍のまたたき
    if (rain) {
      const r = rain.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < r.count; i++) { let y = r.getY(i) - dt * 7; if (y < 0) y = 7; r.setY(i, y); }
      r.needsUpdate = true;
    }
  });
  useEffect(() => () => { geo.dispose(); rain?.dispose(); }, [geo, rain]);
  return (
    <>
      <points geometry={geo}>
        <pointsMaterial ref={mat} color={def.particle} size={season === "winter" ? 0.06 : 0.045} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      {rain && <points geometry={rain}><pointsMaterial color="#9fb4ff" size={0.03} transparent opacity={0.5} depthWrite={false} /></points>}
    </>
  );
}

function Rig({ mode, yaw, vel, dragging }: { mode: "hall" | "portrait"; yaw: React.MutableRefObject<number>; vel: React.MutableRefObject<number>; dragging: React.MutableRefObject<boolean> }) {
  const hero = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const reduce = useMemo(prefersReducedMotion, []);
  useEffect(() => {
    const narrow = size.width < size.height * 0.9;
    if (mode === "portrait") { camera.position.set(0, 1.25, narrow ? 4.2 : 3.4); camera.lookAt(0, 1.0, 0); }
    else { camera.position.set(0, 2.1, narrow ? 7.4 : 6.0); camera.lookAt(0, 1.2, 0); }
  }, [camera, size, mode]);
  useFrame((_, dt) => {
    if (!dragging.current) { vel.current *= 0.92; yaw.current += vel.current; if (!reduce) yaw.current += dt * 0.12; }
    if (hero.current) hero.current.rotation.y = yaw.current;
  });
  return <group ref={hero}><Hero calm={reduce} /></group>;
}

export default function AcademyScene({ time, season, weather, mode = "hall", burst = 0, className = "" }: Props) {
  const T = TIME[time];
  const { yaw, vel, dragging, handlers } = useDragRotate();
  const fogDensity = weather === "mist" ? 0.11 : weather === "rain" ? 0.07 : 0.045;
  return (
    <div className={`relative ${className}`} style={{ background: `linear-gradient(180deg, ${T.sky[0]}, ${T.sky[1]} 140%)`, touchAction: "pan-y" }}
      {...handlers} role="img" aria-label={`3Dの学院と主人公。${T.label}。ドラッグで回せます`}>
      <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} camera={{ fov: 42, near: 0.1, far: 60 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.outputColorSpace = THREE.SRGBColorSpace; }}>
        <fogExp2 attach="fog" args={[T.fog, fogDensity]} />
        <ambientLight intensity={T.ambient} color={time === "night" ? "#6f74c9" : "#d8c8ff"} />
        <directionalLight position={[2, 6, -6]} intensity={time === "day" ? 1.1 : time === "night" ? 0.35 : 0.7} color={T.window} />
        <hemisphereLight args={["#8b84d8", "#120e1c", 0.35]} />
        {mode === "hall" && (
          <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[14, 48]} /><meshStandardMaterial color="#1b1830" roughness={0.55} metalness={0.25} /></mesh>
            {Array.from({ length: 8 }, (_, i) => <Pillar key={i} angle={(-0.9 + (i / 7) * 1.8) * Math.PI * 0.62} radius={5.4} />)}
            <GothicWindows color={T.window} />
            {[[-1.9, 0, 0.6], [1.9, 0, 0.6], [-2.6, 0, -1.8], [2.6, 0, -1.8]].map((p, i) => <Candle key={i} seed={i} position={p as [number, number, number]} />)}
            <Particles season={season} weather={weather} />
          </>
        )}
        {mode === "portrait" && (
          <>
            <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3, 40]} /><meshStandardMaterial color="#1b1830" roughness={0.6} /></mesh>
            <pointLight position={[-1.6, 2.2, 1.6]} intensity={2.5} color="#ffb45e" distance={6} />
            <Particles season={season} weather="clear" count={80} />
          </>
        )}
        <FloorCircle burst={burst} />
        <Rig mode={mode} yaw={yaw} vel={vel} dragging={dragging} />
      </Canvas>
    </div>
  );
}
