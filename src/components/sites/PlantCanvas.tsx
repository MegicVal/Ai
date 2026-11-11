"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import type { Plant, SiteControl } from "./types";

/**
 * The plant from above: real building footprints (OpenStreetMap) extruded over
 * satellite imagery. FICEP's buildings are white, the neighbourhood is grey.
 */
class PlantModel {
  readonly group = new THREE.Group();
  readonly labels: { id: string; at: THREE.Vector3 }[] = [];
  private readonly trash: { dispose(): void }[] = [];
  private readonly point = new THREE.Vector3();
  private time = 0;

  constructor(plant: Plant) {
    const { ground } = plant;
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x1b2321 });
    const groundGeometry = new THREE.PlaneGeometry(ground.east - ground.west, ground.north - ground.south);
    const plane = new THREE.Mesh(groundGeometry, groundMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((ground.west + ground.east) / 2, 0, -(ground.north + ground.south) / 2);
    this.group.add(plane);
    this.trash.push(groundGeometry, groundMaterial);
    this.loadImagery(plant, groundMaterial);

    const own = new THREE.MeshStandardMaterial({ color: 0xf4f6f5, roughness: 0.7, metalness: 0.05 });
    const other = new THREE.MeshStandardMaterial({ color: 0x8f9a96, roughness: 0.9, transparent: true, opacity: 0.55 });
    const edge = new THREE.LineBasicMaterial({ color: 0x2cc4a6 });
    this.trash.push(own, other, edge);
    for (const building of plant.buildings) {
      const shape = new THREE.Shape(building.points.map(([x, y]) => new THREE.Vector2(x, y)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: building.height, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, building.ficep ? own : other);
      mesh.castShadow = building.ficep;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.trash.push(geometry);
      if (building.ficep) {
        const edges = new THREE.EdgesGeometry(geometry, 30);
        this.group.add(new THREE.LineSegments(edges, edge));
        this.trash.push(edges);
      }
      if (building.role) {
        const cx = building.points.reduce((sum, p) => sum + p[0], 0) / building.points.length;
        const cy = building.points.reduce((sum, p) => sum + p[1], 0) / building.points.length;
        this.labels.push({ id: building.role, at: new THREE.Vector3(cx, building.height + 6, -cy) });
      }
    }
  }

  /** Draws the satellite tiles into one texture. If they cannot be loaded the ground stays plain. */
  private loadImagery(plant: Plant, material: THREE.MeshBasicMaterial) {
    const { tiles, z, x0, y0, n } = plant.ground;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256 * n;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1b2321";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    this.trash.push(texture);
    let loaded = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          ctx.drawImage(image, 256 * i, 256 * j);
          texture.needsUpdate = true;
          if (++loaded === 1) {
            material.map = texture;
            material.color.setHex(0xb9c2be);
            material.needsUpdate = true;
          }
        };
        image.src = tiles.replace("{z}", String(z)).replace("{x}", String(x0 + i)).replace("{y}", String(y0 + j));
      }
    }
  }

  update(camera: THREE.PerspectiveCamera, width: number, height: number, dt: number, control: SiteControl) {
    if (!control.reduce) this.time += dt;
    const radius = 430 * control.zoom;
    const azimuth = 0.5 + Math.sin(this.time * 0.07) * 0.35 + control.yaw;
    const polar = Math.max(0.25, Math.min(1.35, 0.95 - control.pitch));
    camera.position.set(radius * Math.sin(polar) * Math.sin(azimuth), radius * Math.cos(polar), radius * Math.sin(polar) * Math.cos(azimuth));
    camera.lookAt(0, 6, 10);
    camera.updateMatrixWorld();
    this.labels.forEach(({ at }, index) => {
      const element = control.markers[index];
      if (!element) return;
      this.point.copy(at).project(camera);
      element.style.transform = `translate(${((this.point.x * 0.5 + 0.5) * width).toFixed(1)}px, ${((-this.point.y * 0.5 + 0.5) * height).toFixed(1)}px)`;
      element.style.opacity = this.point.z < 1 ? "1" : "0";
    });
  }

  dispose() {
    this.trash.forEach((item) => item.dispose());
  }
}

function Scene({ plant, control, onLabels }: { plant: Plant; control: RefObject<SiteControl>; onLabels: (ids: string[]) => void }) {
  const model = useMemo(() => new PlantModel(plant), [plant]);
  useEffect(() => {
    onLabels(model.labels.map((label) => label.id));
    return () => model.dispose();
  }, [model, onLabels]);
  useFrame((state, delta) => {
    model.update(state.camera as THREE.PerspectiveCamera, state.size.width, state.size.height, Math.min(delta, 0.05), control.current);
  });
  return (
    <>
      <hemisphereLight args={[0xffffff, 0x6f7b77, 2.4]} />
      <directionalLight castShadow position={[180, 320, 140]} intensity={2.6} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006}>
        <orthographicCamera attach="shadow-camera" args={[-320, 320, 320, -320, 10, 900]} />
      </directionalLight>
      <primitive object={model.group} />
    </>
  );
}

export default function PlantCanvas({
  plant,
  control,
  active,
  label,
  onLabels,
}: {
  plant: Plant;
  control: RefObject<SiteControl>;
  active: boolean;
  label: string;
  onLabels: (ids: string[]) => void;
}) {
  return (
    <Canvas
      flat
      shadows
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 35, near: 5, far: 4000, position: [200, 300, 300] }}
      role="img"
      aria-label={label}
    >
      <Scene plant={plant} control={control} onLabels={onLabels} />
    </Canvas>
  );
}
