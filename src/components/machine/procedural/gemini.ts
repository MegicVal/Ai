import * as THREE from "three";
import type { BuiltMachine, BuiltPart, ProceduralMachine } from "../types";

/**
 * GEMINI, simplified: a gantry plate line built from boxes and cylinders.
 * Placeholder geometry until FICEP supplies CAD exports. Units are metres.
 */

const CONSOLE = new THREE.Vector3(4.1, 0, 1.75);
const SPARKS = 70;

function screenTexture(title: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0C1110";
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = "#ECF0EE";
  ctx.font = "600 20px monospace";
  ctx.fillText(title, 22, 36);
  ctx.strokeStyle = "#2CC4A6";
  ctx.lineWidth = 3;
  const nests = [
    [22, 58, 150, 104], [184, 58, 96, 58], [292, 58, 198, 84], [184, 128, 96, 34],
    [22, 176, 112, 122], [146, 176, 158, 56], [316, 154, 174, 144], [146, 244, 158, 54],
  ];
  nests.forEach(([x, y, w, h]) => ctx.strokeRect(x, y, w, h));
  ctx.fillStyle = "#2CC4A6";
  [[60, 96], [120, 130], [340, 96], [440, 110], [70, 236], [380, 220], [440, 270], [220, 204]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#E2571C";
  ctx.fillRect(22, 308, 300, 5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const gemini: ProceduralMachine = {
  view: {
    halfWidth: { landscape: 6.3, portrait: 4.4 },
    halfHeight: 3.9,
    azimuth: { landscape: 0.6, portrait: 1.12 },
    targetY: { landscape: 1.05, portrait: 1.5 },
  },

  build(lineMaterial): BuiltMachine {
    const parts: Record<string, BuiltPart> = {};
    const trash: { dispose(): void }[] = [];
    let current: BuiltPart = { group: new THREE.Group(), materials: [] };

    const begin = (id: string) => {
      current = { group: new THREE.Group(), materials: [] };
      parts[id] = current;
    };
    const mat = (color: number, options: THREE.MeshStandardMaterialParameters = {}, highlight = true) => {
      const material = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.55, ...options });
      if (highlight) current.materials.push(material);
      trash.push(material);
      return material;
    };
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const edgeGeometry = new THREE.EdgesGeometry(geometry, 35);
      const edges = new THREE.LineSegments(edgeGeometry, lineMaterial);
      edges.raycast = () => {};
      mesh.add(edges);
      current.group.add(mesh);
      trash.push(geometry, edgeGeometry);
      return mesh;
    };
    const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
    const cyl = (top: number, h: number, bottom = top) => new THREE.CylinderGeometry(top, bottom, h, 28);
    const panel = { roughness: 0.62, metalness: 0.08 };
    const steel = { metalness: 0.6, roughness: 0.35 };

    // 1 · frame and bed
    begin("base");
    {
      const dark = mat(0x3d4844);
      const plate = mat(0xc4ccc8, { metalness: 0.55, roughness: 0.38 });
      const white = mat(0xf4f6f5, panel);
      add(box(6.6, 0.42, 2.5), dark, 0, 0.27, 0);
      for (let i = 0; i < 27; i++) add(box(0.035, 0.12, 2.36), dark, -3.12 + i * 0.24, 0.54, 0);
      add(box(5.6, 0.05, 2.05), plate, -0.2, 0.625, 0);
      [[-2.4, -0.6], [-2.4, 0.1], [-1.9, 0.7], [-1.5, -0.3], [-1.1, 0.45], [-2.0, -0.1]].forEach(([x, z]) =>
        add(cyl(0.07, 0.052), dark, x, 0.626, z),
      );
      add(box(7.2, 0.16, 0.2), white, 0, 0.5, 1.52);
      add(box(7.2, 0.16, 0.2), white, 0, 0.5, -1.52);
      [-3.2, -1.1, 1.1, 3.2].forEach((x) => {
        add(box(0.22, 0.42, 0.3), dark, x, 0.21, 1.52);
        add(box(0.22, 0.42, 0.3), dark, x, 0.21, -1.52);
      });
    }

    // 2 · gantry
    begin("gantry");
    {
      const white = mat(0xf4f6f5, panel);
      const green = mat(0x00705f, { roughness: 0.5 });
      const dark = mat(0x3d4844);
      add(box(0.9, 0.18, 0.34), dark, 0, 0.67, 1.52);
      add(box(0.9, 0.18, 0.34), dark, 0, 0.67, -1.52);
      add(box(0.56, 1.1, 0.42), white, 0, 1.3, 1.52);
      add(box(0.56, 1.1, 0.42), white, 0, 1.3, -1.52);
      add(box(0.62, 0.52, 3.6), white, 0, 2.0, 0);
      add(box(0.64, 0.07, 3.6), green, 0, 2.2, 0);
      add(box(0.2, 0.12, 3.3), dark, -0.16, 2.34, 0);
      add(box(0.04, 0.3, 3.2), dark, 0.33, 2.0, 0);
    }

    // 3 · spindle head
    begin("head");
    {
      const dark = mat(0x3d4844);
      const white = mat(0xf4f6f5, panel);
      const metal = mat(0xbfc8c4, steel);
      add(box(0.3, 0.9, 0.6), dark, 0, -0.05, 0);
      add(cyl(0.14, 0.5), white, 0.03, 0.62, 0);
      add(cyl(0.11, 0.42), metal, 0.05, -0.68, 0);
      add(cyl(0.07, 0.1, 0.05), dark, 0.05, -0.94, 0);
      add(cyl(0.028, 0.2, 0.004), metal, 0.05, -1.08, 0);
    }

    // 4 · tool changer and plasma torch
    begin("tools");
    const metal = mat(0xbfc8c4, steel);
    const toolDark = mat(0x3d4844);
    const hot = mat(0xe2571c, { emissive: 0xe2571c, emissiveIntensity: 0.9 }, false);
    add(box(0.24, 0.2, 0.3), toolDark, 0.02, -0.2, -0.62);
    add(cyl(0.3, 0.07), metal, 0.12, -0.36, -0.62);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      add(cyl(0.04, 0.2, 0.02), k % 2 ? toolDark : metal, 0.12 + Math.cos(a) * 0.22, -0.5, -0.62 + Math.sin(a) * 0.22);
    }
    add(box(0.22, 0.3, 0.22), toolDark, 0.02, -0.3, 0.62);
    add(cyl(0.055, 0.62), toolDark, 0.1, -0.72, 0.62);
    add(cyl(0.05, 0.14, 0.012), hot, 0.1, -1.1, 0.62);
    const glow = new THREE.PointLight(0xff7a3d, 3, 3, 2);
    glow.position.set(0.1, -1.15, 0.62);
    current.group.add(glow);
    const sparkPositions = new Float32Array(SPARKS * 3);
    const sparkState = Array.from({ length: SPARKS }, () => [0, 0, 0, 0]);
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMaterial = new THREE.PointsMaterial({ color: 0xff9a4d, size: 0.045, transparent: true, depthWrite: false });
    const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
    sparks.frustumCulled = false;
    sparks.raycast = () => {};
    current.group.add(sparks);
    trash.push(sparkGeometry, sparkMaterial);

    // 5 · control station and electrical cabinet
    begin("cnc");
    {
      const white = mat(0xf4f6f5, panel);
      const dark = mat(0x3d4844);
      const green = mat(0x00705f, { roughness: 0.5 });
      add(box(0.46, 1.05, 0.4), dark, 0, 0.525, 0);
      const housing = add(box(0.86, 0.56, 0.07), dark, 0, 1.38, 0);
      housing.rotation.set(-0.28, -0.5, 0, "YXZ");
      const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture("CNC · IN LAVORAZIONE") });
      const screenGeometry = new THREE.PlaneGeometry(0.78, 0.48);
      const screen = new THREE.Mesh(screenGeometry, screenMaterial);
      screen.position.set(-0.018, 1.391, 0.036);
      screen.rotation.set(-0.28, -0.5, 0, "YXZ");
      current.group.add(screen);
      trash.push(screenGeometry, screenMaterial, screenMaterial.map!);
      add(box(0.5, 1.6, 1.25), white, 0.2, 0.8, -3.0);
      add(box(0.52, 0.06, 1.25), green, 0.2, 1.46, -3.0);
      add(box(0.02, 1.2, 0.02), dark, -0.06, 0.8, -3.0);
    }

    // 6 · software: a floating panel that leaves the screen when the machine opens
    begin("sw");
    const softwareMaterial = new THREE.MeshBasicMaterial({
      map: screenTexture("NESTING · 3600 × 6000"),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const softwareGeometry = new THREE.PlaneGeometry(1.6, 1.0);
    current.group.add(new THREE.Mesh(softwareGeometry, softwareMaterial));
    const frameGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.72, 1.12));
    const frameMaterial = new THREE.LineBasicMaterial({ color: 0x2cc4a6, transparent: true, opacity: 0 });
    const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
    frame.raycast = () => {};
    current.group.add(frame);
    trash.push(softwareGeometry, softwareMaterial, softwareMaterial.map!, frameGeometry, frameMaterial);

    return {
      parts,
      hidden: (explode) => (explode < 0.5 ? ["sw"] : []),
      tick(time, dt, live, explode, camera) {
        const gantryX = Math.sin(time * 0.33) * 1.9 * live;
        const carriageZ = Math.sin(time * 0.61 + 1) * 0.55 * live;
        parts.base.group.position.set(0, 0, 0);
        parts.gantry.group.position.set(gantryX, 0, 0);
        parts.head.group.position.set(gantryX + 0.48, 1.9, carriageZ);
        parts.tools.group.position.set(gantryX + 0.48, 1.9, carriageZ);
        parts.cnc.group.position.copy(CONSOLE);
        parts.sw.group.position.set(CONSOLE.x, 1.39, CONSOLE.z);

        // sparks fall from the torch while the line is working
        for (let i = 0; i < SPARKS; i++) {
          const s = sparkState[i];
          s[3] -= dt;
          if (s[3] <= 0) {
            sparkPositions[i * 3] = 0.1;
            sparkPositions[i * 3 + 1] = -1.18;
            sparkPositions[i * 3 + 2] = 0.62;
            const a = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.6;
            s[0] = Math.cos(a) * speed;
            s[1] = 0.6 + Math.random() * 1.4;
            s[2] = Math.sin(a) * speed;
            s[3] = 0.25 + Math.random() * 0.45;
          }
          s[1] -= 6 * dt;
          sparkPositions[i * 3] += s[0] * dt;
          sparkPositions[i * 3 + 1] = Math.max(-1.27, sparkPositions[i * 3 + 1] + s[1] * dt);
          sparkPositions[i * 3 + 2] += s[2] * dt;
        }
        sparkGeometry.attributes.position.needsUpdate = true;
        sparkMaterial.opacity = dt === 0 ? 0 : 0.95 * live;
        glow.intensity = 3 * live + 0.5;

        softwareMaterial.opacity = explode;
        frameMaterial.opacity = explode;
        parts.sw.group.scale.setScalar(0.45 + 0.55 * explode);
        parts.sw.group.quaternion.copy(camera.quaternion);
      },
      dispose() {
        trash.forEach((item) => item.dispose());
      },
    };
  },
};
