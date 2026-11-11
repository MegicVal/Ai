import * as THREE from "three";
import type { Kit } from "./kit";

/**
 * Simplified models, one per machine family. Each builder fills named parts
 * (the ids match content/viewer.json) and may return a working animation.
 * Placeholder geometry until FICEP supplies CAD exports. Units are metres.
 */
export type Animate = (time: number, dt: number, live: number) => void;
export type Built = { console: THREE.Vector3; animate?: Animate };
type Builder = (k: Kit, variant: string) => Built;

const TAU = Math.PI * 2;

/** Gantry travelling over a fixed plate: KRONOS, GEMINI, GEMINI LASER, ENERGY. */
const plateGantry: Builder = (k, variant) => {
  k.part("base");
  k.box(6.6, 0.42, 2.5, "dark", 0, 0.27, 0);
  for (let i = 0; i < 27; i++) k.box(0.035, 0.12, 2.36, "dark", -3.12 + i * 0.24, 0.54, 0);
  k.box(5.6, 0.05, 2.05, "plate", -0.2, 0.625, 0);
  [[-2.4, -0.6], [-2.4, 0.1], [-1.9, 0.7], [-1.5, -0.3], [-1.1, 0.45], [-2.0, -0.1]].forEach(([x, z]) =>
    k.cyl(0.07, 0.052, "dark", x, 0.626, z),
  );
  k.box(7.2, 0.16, 0.2, "white", 0, 0.5, 1.52);
  k.box(7.2, 0.16, 0.2, "white", 0, 0.5, -1.52);
  [-3.2, -1.1, 1.1, 3.2].forEach((x) => {
    k.box(0.22, 0.42, 0.3, "dark", x, 0.21, 1.52);
    k.box(0.22, 0.42, 0.3, "dark", x, 0.21, -1.52);
  });

  const gantry = k.part("gantry");
  k.box(0.9, 0.18, 0.34, "dark", 0, 0.67, 1.52);
  k.box(0.9, 0.18, 0.34, "dark", 0, 0.67, -1.52);
  k.box(0.56, 1.1, 0.42, "white", 0, 1.3, 1.52);
  k.box(0.56, 1.1, 0.42, "white", 0, 1.3, -1.52);
  k.box(0.62, 0.52, 3.6, "white", 0, 2.0, 0);
  k.box(0.64, 0.07, 3.6, "green", 0, 2.2, 0);
  k.box(0.2, 0.12, 3.3, "dark", -0.16, 2.34, 0);

  // working head: drilling spindle, laser head or milling heads
  const head = k.part("head");
  k.box(0.3, 0.9, 0.6, "dark", 0.48, 1.85, 0);
  k.cyl(0.14, 0.5, "white", 0.51, 2.52, 0);
  if (variant === "laser") {
    k.cyl(0.07, 0.5, "steel", 0.53, 1.2, 0);
    k.cyl(0.05, 0.14, "hot", 0.53, 0.86, 0, "y", 0.012);
  } else if (variant === "milling") {
    [-0.35, 0.35].forEach((z) => {
      k.cyl(0.13, 0.5, "steel", 0.53, 1.2, z);
      k.cyl(0.16, 0.08, "dark", 0.53, 0.92, z);
    });
  } else if (variant !== "thermal") {
    k.cyl(0.11, 0.42, "steel", 0.53, 1.22, 0);
    k.cyl(0.07, 0.1, "dark", 0.53, 0.96, 0, "y", 0.05);
    k.cyl(0.028, 0.2, "steel", 0.53, 0.82, 0, "y", 0.004);
  }

  // tools: changer disc and cutting torches
  const tools = k.part("tools");
  let sparks: ((dt: number, live: number) => void) | undefined;
  if (variant !== "thermal" && variant !== "laser") {
    k.box(0.24, 0.2, 0.3, "dark", 0.5, 1.7, -0.62);
    k.cyl(0.3, 0.07, "steel", 0.6, 1.54, -0.62);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      k.cyl(0.04, 0.2, i % 2 ? "dark" : "steel", 0.6 + Math.cos(a) * 0.22, 1.4, -0.62 + Math.sin(a) * 0.22, "y", 0.02);
    }
  }
  if (variant !== "milling") {
    const torches = variant === "thermal" ? [0.62, 0.2, -0.3] : [0.62];
    torches.forEach((z) => {
      k.box(0.22, 0.3, 0.22, "dark", 0.5, 1.6, z);
      k.cyl(0.055, 0.62, "dark", 0.58, 1.18, z);
      k.cyl(0.05, 0.14, "hot", 0.58, 0.8, z, "y", 0.012);
    });
    sparks = k.sparks(new THREE.Vector3(0.58, 0.72, 0.62), 0.63);
  }

  const consoleAt = k.console(4.1, 1.75);
  k.cabinet(4.3, -1.25);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      const x = Math.sin(time * 0.33) * 1.9 * live;
      const z = Math.sin(time * 0.61 + 1) * 0.55 * live;
      gantry.position.x = x;
      head.position.set(x, 0, z);
      tools.position.set(x, 0, z);
      sparks?.(dt, live);
    },
  };
};

/** Plate fed on rollers through a fixed frame: P, TIPO A, TIPO B, TIPO G. */
const plateRoller: Builder = (k, variant) => {
  k.part("conveyor");
  k.conveyor(-4.2, 4.2, 0, 2.2, 0.75, 0.38);
  const plate = k.box(3.2, 0.05, 1.8, "plate", -1.2, 0.83, 0);

  k.part("frame");
  k.box(1.5, 0.6, 3.2, "dark", 0.4, 0.3, 0);
  k.box(0.9, 2.3, 0.5, "white", 0.4, 1.45, 1.45);
  k.box(0.9, 2.3, 0.5, "white", 0.4, 1.45, -1.45);
  k.box(1.0, 0.6, 3.4, "white", 0.4, 2.45, 0);
  k.box(1.02, 0.07, 3.4, "green", 0.4, 2.68, 0);

  const head = k.part("head");
  k.box(0.5, 0.8, 0.5, "dark", 0.4, 1.75, 0);
  if (variant.startsWith("punch")) {
    k.cyl(0.2, 0.5, "steel", 0.4, 1.2, 0);
    k.cyl(0.07, 0.16, "dark", 0.4, 0.94, 0);
  } else {
    k.cyl(0.11, 0.5, "steel", 0.4, 1.2, 0);
    k.cyl(0.028, 0.2, "steel", 0.4, 0.94, 0, "y", 0.004);
  }

  k.part("tools");
  let sparks: ((dt: number, live: number) => void) | undefined;
  if (variant.includes("thermal")) {
    k.box(0.3, 0.5, 0.3, "dark", 1.3, 1.9, 0.5);
    k.cyl(0.055, 0.7, "dark", 1.3, 1.35, 0.5);
    k.cyl(0.05, 0.14, "hot", 1.3, 0.94, 0.5, "y", 0.012);
    sparks = k.sparks(new THREE.Vector3(1.3, 0.87, 0.5), 0.84);
  } else {
    k.cyl(0.3, 0.07, "steel", 1.2, 1.5, -0.6);
    for (let i = 0; i < 6; i++) k.cyl(0.05, 0.22, "dark", 1.2 + Math.cos((i / 6) * TAU) * 0.2, 1.36, -0.6 + Math.sin((i / 6) * TAU) * 0.2);
  }

  const consoleAt = k.console(2.6, 2.3);
  k.cabinet(2.6, -2.3);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      plate.position.x = -1.2 + Math.sin(time * 0.4) * 1.4 * live;
      head.position.z = Math.sin(time * 0.7) * 0.6 * live;
      sparks?.(dt, live);
    },
  };
};

/** Beam on a roller conveyor passing through a drilling frame: the beam lines. */
const beamLine: Builder = (k, variant) => {
  const big = variant === "gantry";
  const reach = variant === "compact" ? 3.4 : 5.6;
  k.part("conveyor");
  k.conveyor(-reach, -0.9, 0, 1.3);
  k.conveyor(0.9, reach, 0, 1.3);
  const beam = k.beam(variant === "compact" ? 4.2 : 6.2, -1.0, 0.76, 0, big ? 0.9 : 0.5, big ? 0.45 : 0.3);

  k.part("frame");
  const h = big ? 3.0 : 2.4;
  k.box(1.5, 0.3, 2.8, "dark", 0, 0.15, 0);
  if (variant === "cantilever") {
    k.box(0.8, h, 0.7, "white", 0, h / 2 + 0.3, -1.25);
    k.box(0.7, 0.5, 2.2, "white", 0, h + 0.05, -0.3);
    k.box(0.72, 0.07, 2.2, "green", 0, h + 0.33, -0.3);
  } else {
    k.box(0.9, h, 0.5, "white", 0, h / 2 + 0.3, 1.2);
    k.box(0.9, h, 0.5, "white", 0, h / 2 + 0.3, -1.2);
    k.box(1.0, 0.55, 2.9, "white", 0, h + 0.5, 0);
    k.box(1.02, 0.07, 2.9, "green", 0, h + 0.82, 0);
  }

  // spindles: one from above, plus one per side on multi-spindle lines
  const heads = k.part("heads");
  const top = h - 0.4;
  if (variant === "scribe") {
    [[0, top + 0.3, 0, "y"], [0, 1.0, 0.75, "z"], [0, 1.0, -0.75, "z"], [0, 0.45, 0, "y"]].forEach(([x, y, z, axis]) => {
      k.box(0.3, 0.3, 0.3, "dark", x as number, y as number, z as number);
      k.cyl(0.03, 0.3, "hot", x as number, (y as number) - (axis === "y" ? 0.25 : 0), (z as number) * (axis === "z" ? 0.75 : 1), axis as "y" | "z", 0.006);
    });
  } else {
    k.box(0.45, 0.7, 0.45, "dark", 0, top + 0.15, 0);
    k.cyl(0.1, 0.45, "steel", 0, top - 0.4, 0);
    k.cyl(0.028, 0.22, "steel", 0, top - 0.72, 0, "y", 0.004);
    if (variant === "triple" || big) {
      [0.78, -0.78].forEach((z) => {
        k.box(0.45, 0.45, 0.5, "dark", 0, 1.0, z);
        k.cyl(0.1, 0.34, "steel", 0, 1.0, z * 0.62, "z");
      });
    }
    if (variant === "single" || variant === "cantilever") k.cyl(0.26, 0.12, "steel", 0, top + 0.15, 0.3, "z");
  }

  k.part("clamps");
  [-0.62, 0.62].forEach((x) => {
    k.box(0.2, 0.5, 0.3, "dark", x, 1.0, 0.42);
    k.box(0.2, 0.5, 0.3, "dark", x, 1.0, -0.42);
    k.box(0.24, 0.12, 1.5, "dark", x, 0.64, 0);
  });

  const carriage = k.part("carriage");
  k.box(reach - 1, 0.16, 0.14, "white", -(reach + 1) / 2, 0.95, 1.05);
  k.box(0.5, 0.5, 0.5, "green", -3.0, 1.15, 1.05);
  k.box(0.3, 0.2, 0.7, "dark", -3.0, 1.0, 0.6);

  const consoleAt = k.console(1.9, 2.3);
  k.cabinet(1.9, -2.3);
  return {
    console: consoleAt,
    animate(time, _dt, live) {
      const shift = Math.sin(time * 0.35) * 0.9 * live;
      beam.position.x = -1.0 + shift;
      carriage.children[1].position.x = -3.0 + shift;
      carriage.children[2].position.x = -3.0 + shift;
      heads.position.y = -Math.max(0, Math.sin(time * 1.3)) * 0.12 * live;
    },
  };
};

/** Angle or flat bar fed through punching/drilling and shearing units. */
const angleLine: Builder = (k, variant) => {
  const flat = variant === "flat";
  k.part("conveyor");
  k.conveyor(-6.2, -1.1, 0, 0.7, 0.8);
  k.conveyor(2.4, 4.6, 0, 0.7, 0.8);
  const bar = new THREE.Group();
  k.add(bar);
  if (flat) {
    const m = k.box(6.0, 0.03, 0.4, "plate", 0, 0.87, 0);
    bar.attach(m);
  } else {
    const a = k.box(6.0, 0.03, 0.22, "plate", 0, 0.87, 0.1);
    const b = k.box(6.0, 0.22, 0.03, "plate", 0, 0.97, 0);
    bar.attach(a);
    bar.attach(b);
  }
  bar.position.x = -2.4;

  const carriage = k.part("carriage");
  k.box(5.0, 0.14, 0.14, "white", -3.6, 1.05, -0.55);
  k.box(0.5, 0.45, 0.45, "green", -4.6, 1.2, -0.55);
  k.box(0.28, 0.16, 0.5, "dark", -4.6, 1.02, -0.2);

  const punch = k.part("punch");
  k.box(1.5, 0.7, 1.3, "dark", -0.2, 0.35, 0);
  k.box(1.3, 1.5, 1.2, "white", -0.2, 1.45, -0.15);
  k.box(1.32, 0.07, 1.2, "green", -0.2, 2.1, -0.15);
  if (flat) {
    k.cyl(0.1, 0.5, "steel", -0.2, 1.3, 0.3);
    k.cyl(0.028, 0.2, "steel", -0.2, 0.98, 0.3, "y", 0.004);
  } else {
    [-0.45, 0.05].forEach((x) => {
      k.cyl(0.13, 0.5, "steel", x, 1.25, 0.45).rotation.x = -0.75;
      k.cyl(0.13, 0.5, "steel", x, 1.25, 0.15).rotation.x = 0.75;
    });
  }
  k.cyl(0.18, 0.1, "steel", 0.42, 1.35, 0.5, "x");

  k.part("shear");
  k.box(1.1, 0.7, 1.2, "dark", 1.45, 0.35, 0);
  k.box(0.9, 1.3, 1.1, "white", 1.45, 1.35, -0.1);
  k.box(0.3, 0.6, 0.5, "steel", 1.45, 1.0, 0.5);
  k.box(0.06, 0.5, 0.52, "hot", 1.62, 1.0, 0.5);

  const consoleAt = k.console(0.6, 2.0);
  k.cabinet(0.4, -1.6);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      const shift = Math.sin(time * 0.4) * 1.2 * live;
      bar.position.x = -2.4 + shift;
      carriage.children[1].position.x = -4.6 + shift;
      carriage.children[2].position.x = -4.6 + shift;
      punch.children[punch.children.length - 1].rotateY(dt * 0.6 * live);
    },
  };
};

/** Band saw with a tilting bow: KATANA. */
const bandSaw: Builder = (k) => {
  k.part("conveyor");
  k.conveyor(-4.6, -0.7, 0, 1.3);
  k.conveyor(0.7, 4.6, 0, 1.3);
  k.beam(6.0, -0.5, 0.76, 0);

  k.part("saw");
  k.box(1.2, 0.5, 2.6, "dark", 0, 0.25, 0);
  const bow = new THREE.Group();
  k.add(bow);
  [k.box(0.5, 0.9, 0.9, "white", 0, 1.9, 1.2), k.box(0.5, 0.9, 0.9, "white", 0, 1.9, -1.2), k.box(0.5, 0.4, 3.2, "white", 0, 2.45, 0),
   k.box(0.52, 0.07, 3.2, "green", 0, 2.68, 0), k.box(0.02, 1.2, 0.06, "steel", 0, 1.3, 0.5), k.box(0.02, 1.2, 0.06, "steel", 0, 1.3, -0.5)]
    .forEach((m) => bow.attach(m));

  k.part("clamps");
  [-0.5, 0.5].forEach((x) => {
    k.box(0.22, 0.55, 0.3, "dark", x, 1.03, 0.45);
    k.box(0.22, 0.55, 0.3, "dark", x, 1.03, -0.45);
  });

  const consoleAt = k.console(1.7, 2.2);
  k.cabinet(1.6, -2.2);
  return {
    console: consoleAt,
    animate(time, _dt, live) {
      bow.rotation.y = Math.sin(time * 0.25) * 0.5 * live;
      bow.position.y = -Math.max(0, Math.sin(time * 0.8)) * 0.35 * live;
    },
  };
};

/** Six-axis robot working on a section or handling parts: NOZOMI, SABRE, RP, RF, E-LEXINGTON. */
const robotCell: Builder = (k, variant) => {
  const handling = variant.startsWith("handling");
  k.part("conveyor");
  if (handling) {
    k.box(1.6, 0.9, 1.6, "dark", 2.0, 0.45, 0);
    k.cyl(0.16, 0.5, "hot", 2.0, 1.15, 0);
    k.box(1.4, 0.7, 1.4, "white", -2.0, 0.35, 0);
  } else {
    k.conveyor(-4.4, 4.4, 0, 1.3);
    k.beam(6.4, 0, 0.76, 0, 0.6, 0.34);
  }

  k.part("robot");
  let arm: THREE.Group | undefined;
  let sparks: ((dt: number, live: number) => void) | undefined;
  if (variant === "projector") {
    k.box(0.3, 3.4, 0.3, "white", 0, 1.7, -1.6);
    k.box(0.3, 0.3, 1.9, "white", 0, 3.4, -0.75);
    k.box(0.5, 0.35, 0.5, "dark", 0, 3.15, 0);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.3, 1.9, 4, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2cc4a6, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.position.set(0, 2.05, 0);
    cone.rotation.y = Math.PI / 4;
    cone.raycast = () => {};
    k.add(cone);
    k.trash.push(cone.geometry, cone.material as THREE.Material);
  } else {
    const z = handling ? 0 : -1.5;
    k.cyl(0.42, 0.5, "dark", 0, 0.25, z);
    arm = new THREE.Group();
    arm.position.set(0, 0.5, z);
    k.add(arm);
    const lower = new THREE.Group();
    arm.add(lower);
    [k.cyl(0.3, 0.4, "green", 0, 0.7, z), k.box(0.28, 1.5, 0.3, "green", 0, 1.5, z)].forEach((m) => lower.attach(m));
    const upper = new THREE.Group();
    upper.position.set(0, 1.75, 0);
    lower.add(upper);
    [k.cyl(0.2, 0.44, "dark", 0, 2.25, z, "x"), k.box(0.24, 0.24, 1.4, "green", 0, 2.25, z + 0.7), k.cyl(0.1, 0.3, "steel", 0, 2.25, z + 1.5, "z"),
     k.cyl(handling ? 0.16 : 0.04, handling ? 0.1 : 0.3, handling ? "dark" : "hot", 0, 2.05, z + 1.62)].forEach((m) => upper.attach(m));
    arm.userData = { lower, upper };
    if (!handling) sparks = k.sparks(new THREE.Vector3(0, 1.45, 0.1), 1.37, 40);
  }

  k.part("cabin");
  if (!handling) {
    [[-2.2, -2.3], [2.2, -2.3]].forEach(([x, z]) => k.box(0.1, 2.2, 0.1, "dark", x, 1.1, z));
    k.box(4.5, 0.1, 0.1, "dark", 0, 2.2, -2.3);
    k.box(4.5, 1.2, 0.04, "white", 0, 0.7, -2.3);
  } else {
    [[-3, -1.8], [3, -1.8], [-3, 1.8], [3, 1.8]].forEach(([x, z]) => k.box(0.08, 1.6, 0.08, "dark", x, 0.8, z));
    k.box(6.0, 0.06, 0.06, "dark", 0, 1.6, -1.8);
  }

  const consoleAt = k.console(3.0, 2.2);
  k.cabinet(3.2, -2.2);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      if (arm) {
        arm.rotation.y = Math.sin(time * 0.5) * (handling ? 1.4 : 0.5) * live;
        (arm.userData.lower as THREE.Group).rotation.x = Math.sin(time * 0.7) * 0.18 * live;
        (arm.userData.upper as THREE.Group).rotation.x = 0.25 + Math.sin(time * 0.9) * 0.2 * live;
      }
      sparks?.(dt, live);
    },
  };
};

/** Parts travel on a conveyor through a cabin: shot blasting and coating lines. */
const tunnel: Builder = (k, variant) => {
  const blast = variant === "blast";
  k.part("conveyor");
  k.conveyor(-5.2, 5.2, 0, 1.6, 0.8);
  const load = k.beam(3.0, -3.4, 0.86, 0, 0.5, 0.3);

  k.part("cabin");
  k.box(3.0, 0.5, 2.6, "dark", 0, 0.25, 0);
  k.box(3.0, 2.2, 0.2, "white", 0, 1.9, 1.25);
  k.box(3.0, 2.2, 0.2, "white", 0, 1.9, -1.25);
  k.box(3.0, 0.2, 2.7, "white", 0, 3.05, 0);
  k.box(3.02, 0.08, 2.72, "green", 0, 2.75, 0);
  k.box(0.1, 1.3, 2.3, "dark", -1.5, 2.3, 0);
  k.box(0.1, 1.3, 2.3, "dark", 1.5, 2.3, 0);

  const units = k.part("units");
  if (blast) {
    [[-0.7, 1.45], [0.7, 1.45], [-0.7, -1.45], [0.7, -1.45]].forEach(([x, z]) => {
      k.cyl(0.34, 0.3, "steel", x, 1.9, z, "z");
      k.box(0.3, 0.3, 0.4, "dark", x, 1.9, z + Math.sign(z) * 0.3);
    });
  } else {
    [-0.6, 0.6].forEach((x) => {
      k.box(0.1, 1.6, 0.1, "steel", x, 1.9, 1.0);
      k.box(0.1, 1.6, 0.1, "steel", x, 1.9, -1.0);
      [1.4, 1.9, 2.4].forEach((y) => {
        k.cyl(0.04, 0.3, "hot", x, y, 0.82, "z", 0.015);
        k.cyl(0.04, 0.3, "hot", x, y, -0.82, "z", 0.015);
      });
    });
  }

  k.part("filter");
  k.box(1.4, 2.4, 1.2, "white", 0.4, 1.2, -2.6);
  k.cyl(0.28, 1.2, "steel", 0.4, 3.0, -2.6);
  k.box(0.5, 0.5, 0.8, "dark", 0.4, 2.6, -1.7);
  k.cyl(0.5, 0.8, "dark", -0.9, 0.9, -2.6, "y", 0.12);

  const consoleAt = k.console(2.4, 2.3);
  k.cabinet(2.6, -2.6);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      load.position.x = -3.4 + ((time * 0.5) % 7) * live;
      if (blast) for (let i = 0; i < units.children.length; i += 2) units.children[i].rotateY(dt * 4 * live);
    },
  };
};

/** Forging presses: screw (DD, PVX), mechanical (MF), hydraulic (HF, HF X), four-column (HF 4C). */
const press: Builder = (k, variant) => {
  const four = variant === "four-column";
  k.part("frame");
  k.box(2.6, 0.9, 2.2, "dark", 0, 0.45, 0);
  if (four) {
    [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]].forEach(([x, z]) => k.cyl(0.16, 3.0, "steel", x, 2.4, z));
  } else {
    k.box(0.6, 3.0, 1.9, "white", -1.0, 2.4, 0);
    k.box(0.6, 3.0, 1.9, "white", 1.0, 2.4, 0);
  }
  k.box(2.6, 0.9, 2.0, "white", 0, 4.35, 0);
  k.box(2.62, 0.08, 2.0, "green", 0, 3.98, 0);

  const ram = k.part("ram");
  k.box(1.3, 0.8, 1.5, "dark", 0, 2.6, 0);
  k.box(0.9, 0.25, 1.0, "steel", 0, 2.08, 0);

  k.part("drive");
  let wheel: THREE.Mesh | undefined;
  if (variant === "screw") {
    wheel = k.cyl(1.25, 0.35, "green", 0, 5.1, 0);
    k.cyl(0.6, 0.3, "dark", 0, 5.42, 0);
    k.cyl(0.22, 1.2, "steel", 0, 3.6, 0);
  } else if (variant === "mechanical") {
    wheel = k.cyl(1.0, 0.3, "green", 1.5, 4.35, 0, "x");
    k.box(0.9, 0.7, 0.9, "dark", -1.75, 4.35, 0);
    k.cyl(0.2, 3.2, "steel", 0, 4.35, 0, "x");
  } else {
    k.cyl(0.55, 1.3, "steel", 0, 5.45, 0);
    k.box(1.6, 0.8, 1.2, "dark", 0, 6.35, 0);
    k.cyl(0.18, 1.2, "steel", 0, 3.6, 0);
  }

  k.part("dies");
  k.box(1.1, 0.35, 1.2, "steel", 0, 1.08, 0);
  k.cyl(0.2, 0.22, "hot", 0, 1.36, 0);
  const glow = new THREE.PointLight(0xff7a3d, 2.5, 3, 2);
  glow.position.set(0, 1.6, 0.4);
  k.add(glow);

  const consoleAt = k.console(2.6, 1.9);
  k.cabinet(-2.7, -1.2);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      const stroke = Math.pow(Math.max(0, Math.sin(time * 1.6)), 6);
      ram.position.y = -stroke * 0.42 * live;
      wheel?.rotateY(dt * 2.4 * live);
    },
  };
};

/** Billet shears: CADDY, CTCH, CODEBRASS. */
const shear: Builder = (k, variant) => {
  k.part("base");
  k.box(2.4, 0.8, 2.0, "dark", 0, 0.4, 0);
  k.box(1.9, 1.7, 1.7, "white", 0, 1.65, 0);
  k.box(1.92, 0.08, 1.7, "green", 0, 2.25, 0);

  const head = k.part("head");
  k.box(0.5, 1.2, 0.9, "dark", 1.05, 1.5, 0);
  k.box(0.08, 0.7, 0.6, "steel", 1.34, 1.45, 0);
  if (variant === "hydraulic") k.cyl(0.26, 0.9, "steel", 1.05, 2.55, 0);
  else k.cyl(0.75, 0.25, "green", -0.2, 1.7, 1.0, "z");

  k.part("feed");
  k.conveyor(-5.0, -1.25, 0, 0.8, 1.35);
  const bars = new THREE.Group();
  k.add(bars);
  [-0.18, 0, 0.18].forEach((z) => bars.attach(k.cyl(0.08, 3.6, variant === "hydraulic" ? "hot" : "steel", -3.0, 1.49, z, "x")));

  k.part("chute");
  const slide = k.box(1.6, 0.06, 0.8, "steel", 2.2, 1.0, 0);
  slide.rotation.z = -0.45;
  k.box(1.0, 0.7, 1.0, "dark", 3.2, 0.35, 0);
  k.box(0.7, 0.1, 0.8, "white", 2.3, 0.6, 1.1);
  const billet = k.cyl(0.08, 0.3, "steel", 1.6, 1.3, 0, "x");

  const consoleAt = k.console(1.4, 2.1);
  k.cabinet(-1.6, -1.9);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      const cycle = (time * 0.9) % 1;
      head.position.y = -Math.pow(Math.max(0, Math.sin(time * 0.9 * TAU)), 8) * 0.18 * live;
      bars.position.x = cycle * 0.3 * live;
      billet.position.set(1.6 + cycle * 1.4 * live, 1.3 - cycle * 0.7 * live, 0);
      if (variant !== "hydraulic") head.children[head.children.length - 1].rotateY(dt * 3 * live);
    },
  };
};

/** Disc saws for sections, tubes and bars: S, SP, VS. */
const discSaw: Builder = (k, variant) => {
  const vertical = variant === "vertical";
  k.part("base");
  k.box(2.2, 0.9, 1.8, "dark", 0, 0.45, 0);
  k.box(1.8, 0.1, 1.6, "white", 0, 0.95, 0);

  const saw = k.part("saw");
  k.box(0.7, 1.4, 0.9, "white", 0, vertical ? 1.7 : 1.9, -0.75);
  k.box(0.72, 0.07, 0.9, "green", 0, vertical ? 2.3 : 2.5, -0.75);
  const disc = k.cyl(0.6, 0.03, "steel", 0, vertical ? 0.95 : 1.75, -0.05, "x");
  k.cyl(0.14, 0.3, "dark", 0.14, vertical ? 0.95 : 1.75, -0.05, "x");

  k.part("feed");
  k.conveyor(-4.4, -1.2, 0.05, 0.8, 1.0);
  k.conveyor(1.2, 3.4, 0.05, 0.8, 1.0);
  const bar = variant === "horizontal" ? k.cyl(0.14, 5.0, "plate", -1.6, 1.2, 0.05, "x") : k.box(5.0, 0.3, 0.3, "plate", -1.6, 1.21, 0.05);
  [-0.5, 0.5].forEach((x) => k.box(0.2, 0.5, 0.25, "dark", x, 1.25, 0.45));

  const consoleAt = k.console(1.6, 2.0);
  k.cabinet(-1.6, -1.9);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      disc.rotateY(dt * 9 * live);
      const dip = Math.max(0, Math.sin(time * 0.7)) * 0.35 * live;
      saw.position.y = vertical ? dip : -dip;
      bar.position.x = -1.6 + Math.sin(time * 0.35) * 0.3 * live;
    },
  };
};

export const archetypes: Record<string, Builder> = {
  "plate-gantry": plateGantry,
  "plate-roller": plateRoller,
  "beam-line": beamLine,
  "angle-line": (k) => angleLine(k, "angle"),
  "flat-line": (k) => angleLine(k, "flat"),
  "band-saw": bandSaw,
  "robot-cell": robotCell,
  tunnel,
  press,
  shear,
  "disc-saw": discSaw,
};
