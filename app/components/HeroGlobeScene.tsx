"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, useTexture } from "@react-three/drei";
import * as THREE from "three";
import styles from "./HeroGlobe.module.css";
import { heroGlobeImages } from "./heroGlobeImages";

// --- tuning ---------------------------------------------------------------
const RADIUS = 2.0; // sphere radius (world units)
const TILE = 1.7; // photo edge (world units)
const SPEED = 0.22; // orbit speed (radians / second)
const TILT = -0.18; // fixed tilt so we look slightly down onto the globe
const FADE_EXP = 1.9; // higher = steeper fall-off (front sharp, back gone)

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const tmp = new THREE.Vector3();

// Evenly spread points over a sphere (Fibonacci lattice), scaled to RADIUS.
function fibonacciSphere(count: number) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    return new THREE.Vector3(
      Math.cos(theta) * ring * RADIUS,
      y * RADIUS,
      Math.sin(theta) * ring * RADIUS,
    );
  });
}

// One always-frontal photo. drei's <Billboard> keeps it facing the camera while
// the parent group orbits; opacity fades with how far back the tile has turned.
function PhotoTile({ url, position }: { url: string; position: THREE.Vector3 }) {
  const texture = useTexture(url); // suspends until decoded
  const mesh = useRef<THREE.Mesh>(null);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.getWorldPosition(tmp);
    const front = clamp01((tmp.z + RADIUS) / (2 * RADIUS)); // 0 back → 1 front
    (m.material as THREE.MeshBasicMaterial).opacity = Math.pow(front, FADE_EXP);
    m.renderOrder = Math.round(front * 100);
  });

  return (
    <Billboard position={position}>
      <mesh ref={mesh}>
        <planeGeometry args={[TILE, TILE]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

function Globe({
  reduced,
  onReady,
}: {
  reduced: boolean;
  onReady: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(() => fibonacciSphere(heroGlobeImages.length), []);

  // Commits only after every tile's texture has loaded (Suspense) → tells the
  // wrapper it's safe to fade the globe in, already turning.
  useEffect(() => onReady(), [onReady]);

  useFrame((_, dt) => {
    if (group.current) {
      group.current.rotation.y += dt * SPEED * (reduced ? 0.4 : 1);
    }
  });

  return (
    <group ref={group} rotation={[TILT, 0, 0]}>
      {heroGlobeImages.map((url, i) => (
        <PhotoTile key={url} url={url} position={positions[i]} />
      ))}
    </group>
  );
}

export default function HeroGlobeScene() {
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div
      className={`${styles.globe} ${ready ? styles.ready : ""}`}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Globe reduced={reduced} onReady={handleReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
