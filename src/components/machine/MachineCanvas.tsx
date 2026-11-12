"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { MachineRig } from "./rig";
import { Studio } from "./Studio";
import type { StageControl, StagePart, ViewerSource } from "./types";

interface SceneProps {
  name: string;
  source: ViewerSource;
  parts: StagePart[];
  control: RefObject<StageControl>;
  onSelect: (id: string) => void;
}

/** Soft-edged glossy floor: the machine stands on it and casts its shadow there. */
function useFloorFade() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const fade = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
    fade.addColorStop(0, "#fff");
    fade.addColorStop(0.55, "#bbb");
    fade.addColorStop(1, "#000");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }, []);
}

function Scene({ name, source, parts, control, onSelect }: SceneProps) {
  const rig = useMemo(() => new MachineRig(source, parts, name), [source, parts, name]);
  const floor = useRef<THREE.MeshStandardMaterial>(null);
  const fade = useFloorFade();

  useEffect(() => () => rig.dispose(), [rig]);
  useEffect(() => () => fade.dispose(), [fade]);

  useFrame((state, delta) => {
    rig.update(state.camera as THREE.PerspectiveCamera, state.size.width, state.size.height, Math.min(delta, 0.05), control.current, floor.current);
  });

  const pick = (id: string) => (event: ThreeEvent<MouseEvent>) => {
    // A drag ends with a click too: ignore it. Hidden parts let the click through.
    if (event.delta > 6 || rig.isHidden(id)) return;
    event.stopPropagation();
    onSelect(id);
  };

  return (
    <>
      <Studio />
      <hemisphereLight args={[0xffffff, 0x4d5753, 0.5]} />
      <directionalLight castShadow position={[7, 12, 8]} intensity={2.4} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={5}>
        <orthographicCamera attach="shadow-camera" args={[-12, 12, 12, -12, 1, 46]} />
      </directionalLight>
      <directionalLight position={[-8, 5, -7]} intensity={1.3} color={0xbfe9df} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.002} receiveShadow>
        <circleGeometry args={[19, 64]} />
        <meshStandardMaterial ref={floor} color={0x161c1a} roughness={0.5} metalness={0.2} alphaMap={fade} transparent />
      </mesh>
      {rig.entries.map(({ part, built }) => (
        <primitive key={part.id} object={built.group} onClick={pick(part.id)} />
      ))}
    </>
  );
}

interface MachineCanvasProps extends SceneProps {
  active: boolean;
  label: string;
  onReady: () => void;
}

export default function MachineCanvas({ active, label, onReady, ...scene }: MachineCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 30, near: 0.1, far: 300, position: [8, 6, 10] }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.12;
        onReady();
      }}
      role="img"
      aria-label={label}
    >
      <Scene {...scene} />
    </Canvas>
  );
}
