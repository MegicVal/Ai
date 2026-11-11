"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { PerspectiveCamera, ShadowMaterial } from "three";
import { MachineRig } from "./rig";
import type { StageControl, StagePart, ViewerSource } from "./types";

interface SceneProps {
  source: ViewerSource;
  parts: StagePart[];
  control: RefObject<StageControl>;
  onSelect: (id: string) => void;
}

function Scene({ source, parts, control, onSelect }: SceneProps) {
  const rig = useMemo(() => new MachineRig(source, parts), [source, parts]);
  const floor = useRef<ShadowMaterial>(null);

  useEffect(() => () => rig.dispose(), [rig]);

  useFrame((state, delta) => {
    rig.update(state.camera as PerspectiveCamera, state.size.width, state.size.height, Math.min(delta, 0.05), control.current, floor.current);
  });

  const pick = (id: string) => (event: ThreeEvent<MouseEvent>) => {
    // A drag ends with a click too: ignore it. Hidden parts let the click through.
    if (event.delta > 6 || rig.isHidden(id)) return;
    event.stopPropagation();
    onSelect(id);
  };

  return (
    <>
      <hemisphereLight args={[0xffffff, 0x8f9a96, 2.6]} />
      <directionalLight castShadow position={[6, 11, 7]} intensity={3} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-11, 11, 11, -11, 1, 44]} />
      </directionalLight>
      <directionalLight position={[-7, 4, -6]} intensity={1.1} color={0xcfe9e2} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial ref={floor} transparent opacity={0.2} />
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
      flat
      shadows
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 30, near: 0.1, far: 300, position: [8, 6, 10] }}
      onCreated={onReady}
      role="img"
      aria-label={label}
    >
      <Scene {...scene} />
    </Canvas>
  );
}
