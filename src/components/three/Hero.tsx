import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * 主人公の3Dモデル(仮)。ローブ・フード・杖で構成したオリジナルの見習い魔法使い。
 * 実在の人物写真は使わない(GDD 4章)。外見は character.appearance で今後差しかえる。
 */
export default function Hero({ glow = 1, calm = false }: { glow?: number; calm?: boolean }) {
  const orb = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const body = useRef<THREE.Group>(null);
  const robeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#232861", roughness: 0.85, metalness: 0.05 }), []);
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b8913c", roughness: 0.4, metalness: 0.8 }), []);
  const darkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#14112a", roughness: 0.9 }), []);
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9b8a0", roughness: 0.7 }), []);
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5a3b22", roughness: 0.6 }), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = calm ? 1 : 0.85 + Math.sin(t * 2.2) * 0.15;
    if (orb.current) (orb.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2 * pulse * glow;
    if (light.current) light.current.intensity = 2.2 * pulse * glow;
    if (body.current && !calm) body.current.position.y = Math.sin(t * 1.2) * 0.02; // 呼吸
  });
  return (
    <group ref={body}>
      {/* ローブ(すそ広がり) */}
      <mesh position={[0, 0.72, 0]} material={robeMat} castShadow>
        <cylinderGeometry args={[0.2, 0.52, 1.44, 28, 1, true]} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={darkMat}>
        <circleGeometry args={[0.52, 28]} />
      </mesh>
      {/* 前合わせの金の縁取り */}
      <mesh position={[0, 0.72, 0.36]} rotation={[0.27, 0, 0]} material={trimMat}>
        <boxGeometry args={[0.035, 1.42, 0.02]} />
      </mesh>
      {/* 肩と腕 */}
      <mesh position={[0, 1.44, 0]} material={robeMat} castShadow>
        <sphereGeometry args={[0.27, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0.3, 1.12, 0.08]} rotation={[0.2, 0, 0.35]} material={robeMat}>
        <cylinderGeometry args={[0.07, 0.13, 0.62, 12]} />
      </mesh>
      <mesh position={[-0.3, 1.12, 0.04]} rotation={[0.1, 0, -0.3]} material={robeMat}>
        <cylinderGeometry args={[0.07, 0.13, 0.62, 12]} />
      </mesh>
      {/* 頭とフード */}
      <mesh position={[0, 1.72, 0.03]} material={skinMat}>
        <sphereGeometry args={[0.15, 24, 18]} />
      </mesh>
      <mesh position={[0, 1.76, -0.01]} rotation={[-0.25, 0, 0]} material={robeMat} castShadow>
        <sphereGeometry args={[0.21, 24, 18, Math.PI * 0.15, Math.PI * 1.7, 0, Math.PI * 0.75]} />
      </mesh>
      <mesh position={[0, 1.98, -0.12]} rotation={[-0.6, 0, 0]} material={robeMat}>
        <coneGeometry args={[0.1, 0.26, 16]} />
      </mesh>
      {/* 杖と光の玉 */}
      <group position={[0.42, 0.95, 0.18]} rotation={[0.15, 0, -0.32]}>
        <mesh material={woodMat}><cylinderGeometry args={[0.018, 0.026, 1.05, 8]} /></mesh>
        <mesh position={[0, 0.55, 0]} material={trimMat}><torusGeometry args={[0.05, 0.01, 8, 20]} /></mesh>
        <mesh ref={orb} position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.055, 20, 16]} />
          <meshStandardMaterial color="#f3e2b0" emissive="#b49cff" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <pointLight ref={light} position={[0, 0.6, 0]} color="#c4b0ff" distance={3.2} decay={2} />
      </group>
    </group>
  );
}
