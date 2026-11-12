import * as THREE from "three";
import type { Kit } from "./kit";

/**
 * Simplified models, one per machine family. Each builder fills named parts
 * (the ids match content/viewer.json), dresses them with realistic detail and
 * may return a working animation. Placeholder geometry until FICEP supplies
 * CAD exports. Units are metres.
 */
export type Animate = (time: number, dt: number, live: number) => void;
export type Built = { console: THREE.Vector3; animate?: Animate };
type Builder = (k: Kit, variant: string, name: string) => Built;

const TAU = Math.PI * 2;
const HALF = Math.PI / 2;

/** Gantry travelling over a fixed plate: KRONOS, GEMINI, GEMINI LASER, ENERGY. */
const plateGantry: Builder = (k, variant, name) => {
  k.part("base");
  k.box(6.6, 0.42, 2.5, "dark", 0, 0.27, 0);
  for (let i = 0; i < 27; i++) k.box(0.035, 0.12, 2.36, "dark", -3.12 + i * 0.24, 0.54, 0);
  k.box(5.6, 0.05, 2.05, "plate", -0.2, 0.625, 0);
  [[-2.4, -0.6], [-2.4, 0.1], [-1.9, 0.7], [-1.5, -0.3], [-1.1, 0.45], [-2.0, -0.1]].forEach(([x, z]) =>
    k.cyl(0.07, 0.052, "rubber", x, 0.626, z),
  );
  [1.52, -1.52].forEach((z) => {
    k.box(7.2, 0.16, 0.2, "white", 0, 0.5, z);
    k.box(7.2, 0.025, 0.07, "steel", 0, 0.593, z); // guide rail
    k.box(7.2, 0.04, 0.03, "steel", 0, 0.5, z + Math.sign(z) * 0.115); // rack
    k.hazard(0.1, 0.2, 0.24, 3.65, 0.5, z);
    k.hazard(0.1, 0.2, 0.24, -3.65, 0.5, z);
  });
  const legs: [number, number][] = [];
  [-3.2, -1.1, 1.1, 3.2].forEach((x) => [1.52, -1.52].forEach((z) => {
    k.box(0.22, 0.42, 0.3, "dark", x, 0.21, z);
    legs.push([x, z]);
  }));
  k.feet(legs);
  // fume extraction: duct along the bed to a filter unit
  k.cyl(0.16, 5.6, "steel", -0.2, 0.2, -1.05, "x");
  k.hose([[2.6, 0.2, -1.05], [3.1, 0.3, -1.6], [3.3, 0.9, -2.3]], 0.15, "steel");
  k.box(0.9, 1.5, 0.9, "white", 3.4, 0.75, -2.7);
  k.cyl(0.2, 0.5, "steel", 3.4, 1.75, -2.7);
  k.fence([[-3.9, -2.2], [-1.3, -2.2], [1.3, -2.2], [2.7, -2.2]], 1.8);

  const gantry = k.part("gantry");
  [1.52, -1.52].forEach((z) => {
    k.box(0.9, 0.18, 0.34, "dark", 0, 0.7, z);
    k.box(0.56, 1.1, 0.42, "white", 0, 1.33, z);
    k.motor(0.52, 0.86, z, "x", 0.8);
  });
  k.box(0.62, 0.52, 3.6, "white", 0, 2.0, 0);
  k.box(0.64, 0.07, 3.6, "green", 0, 2.2, 0);
  k.box(0.035, 0.03, 3.3, "steel", 0.32, 2.14, 0);
  k.box(0.035, 0.03, 3.3, "steel", 0.32, 1.86, 0);
  k.cableChain(-1.6, 1.6, 2.36, -0.16, "z");
  k.nameplate(name, 1.25, -0.316, 2.02, 0, -HALF);
  k.nameplate(name, 1.0, 0.316, 2.0, -1.2, HALF);
  k.towerLight(0, 2.3, -1.6);

  // working head: drilling spindle, laser head or milling heads
  const head = k.part("head");
  k.box(0.3, 0.9, 0.6, "dark", 0.48, 1.85, 0);
  k.box(0.02, 0.5, 0.4, "green", 0.64, 1.95, 0);
  k.motor(0.5, 2.5, 0, "y", 1.1);
  k.hose([[0.4, 2.6, 0.2], [0.1, 2.8, 0.3], [-0.16, 2.42, 0.4]], 0.02);
  k.hose([[0.4, 2.6, -0.2], [0.05, 2.75, -0.3], [-0.16, 2.42, -0.5]], 0.016);
  if (variant === "laser") {
    k.box(0.22, 0.5, 0.22, "white", 0.55, 1.25, 0);
    k.cyl(0.06, 0.2, "steel", 0.55, 0.95, 0);
    k.cyl(0.04, 0.12, "hot", 0.55, 0.8, 0, "y", 0.01);
  } else if (variant === "milling") {
    [-0.35, 0.35].forEach((z) => {
      k.cyl(0.13, 0.5, "steel", 0.55, 1.2, z);
      k.cyl(0.16, 0.08, "dark", 0.55, 0.92, z);
      k.cyl(0.19, 0.03, "steel", 0.55, 0.87, z);
    });
  } else if (variant !== "thermal") {
    k.cyl(0.11, 0.42, "steel", 0.55, 1.22, 0);
    k.cyl(0.075, 0.1, "dark", 0.55, 0.96, 0, "y", 0.05);
    k.cyl(0.026, 0.2, "steel", 0.55, 0.82, 0, "y", 0.004);
  }

  // tools: changer disc and cutting torches
  const tools = k.part("tools");
  let sparks: ((dt: number, live: number) => void) | undefined;
  if (variant !== "thermal" && variant !== "laser") {
    k.box(0.24, 0.2, 0.3, "dark", 0.5, 1.7, -0.62);
    k.cyl(0.3, 0.07, "steel", 0.6, 1.54, -0.62);
    k.cyl(0.08, 0.1, "dark", 0.6, 1.6, -0.62);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const x = 0.6 + Math.cos(a) * 0.22;
      const z = -0.62 + Math.sin(a) * 0.22;
      k.cyl(0.042, 0.1, "dark", x, 1.46, z);
      k.cyl(0.03, 0.14, "steel", x, 1.36, z, "y", 0.012);
    }
  }
  if (variant !== "milling") {
    const torches = variant === "thermal" ? [0.62, 0.2, -0.3] : [0.62];
    torches.forEach((z) => {
      k.box(0.22, 0.3, 0.22, "dark", 0.5, 1.6, z);
      k.box(0.05, 0.6, 0.05, "steel", 0.62, 1.3, z + 0.09);
      k.cyl(0.05, 0.62, "dark", 0.6, 1.18, z);
      k.cyl(0.058, 0.06, "steel", 0.6, 0.98, z);
      k.cyl(0.045, 0.14, "hot", 0.6, 0.8, z, "y", 0.012);
      k.hose([[0.6, 1.5, z], [0.35, 2.0, z + 0.1], [-0.16, 2.42, z]], 0.018);
    });
    sparks = k.sparks(new THREE.Vector3(0.6, 0.72, 0.62), 0.63);
  }

  const consoleAt = k.console(4.1, 1.75);
  k.cabinet(4.3, -1.05);
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
const plateRoller: Builder = (k, variant, name) => {
  k.part("conveyor");
  k.conveyor(-4.2, 4.2, 0, 2.2, 0.75, 0.38);
  const plate = k.box(3.2, 0.05, 1.8, "plate", -1.2, 0.83, 0);
  k.fence([[-4.4, -1.9], [-1.4, -1.9]], 1.6);

  k.part("frame");
  k.box(1.5, 0.6, 3.2, "dark", 0.4, 0.3, 0);
  k.box(0.9, 2.3, 0.5, "white", 0.4, 1.45, 1.45);
  k.box(0.9, 2.3, 0.5, "white", 0.4, 1.45, -1.45);
  k.box(1.0, 0.6, 3.4, "white", 0.4, 2.45, 0);
  k.box(1.02, 0.07, 3.4, "green", 0.4, 2.68, 0);
  k.nameplate(name, 1.5, 0.905, 2.44, 0, HALF);
  k.hazard(1.52, 0.1, 0.06, 0.4, 0.62, 1.62);
  k.feet([[-0.2, 1.4], [1.0, 1.4], [-0.2, -1.4], [1.0, -1.4]]);
  k.towerLight(0.4, 2.75, -1.5);
  k.cableChain(-1.4, 1.4, 2.82, 0.2, "z");

  const head = k.part("head");
  k.box(0.5, 0.8, 0.5, "dark", 0.4, 1.75, 0);
  k.motor(0.4, 2.3, 0, "y", 1);
  if (variant.startsWith("punch")) {
    k.cyl(0.2, 0.5, "steel", 0.4, 1.2, 0);
    k.cyl(0.07, 0.16, "dark", 0.4, 0.94, 0);
  } else {
    k.cyl(0.11, 0.5, "steel", 0.4, 1.2, 0);
    k.cyl(0.026, 0.2, "steel", 0.4, 0.94, 0, "y", 0.004);
  }

  k.part("tools");
  let sparks: ((dt: number, live: number) => void) | undefined;
  if (variant.includes("thermal")) {
    k.box(0.3, 0.5, 0.3, "dark", 1.3, 1.9, 0.5);
    k.cyl(0.05, 0.7, "dark", 1.3, 1.35, 0.5);
    k.cyl(0.045, 0.14, "hot", 1.3, 0.94, 0.5, "y", 0.012);
    k.hose([[1.3, 2.1, 0.5], [1.1, 2.5, 0.4], [0.9, 2.78, 0.3]], 0.018);
    sparks = k.sparks(new THREE.Vector3(1.3, 0.87, 0.5), 0.84);
  } else {
    k.cyl(0.3, 0.07, "steel", 1.2, 1.5, -0.6);
    for (let i = 0; i < 6; i++) k.cyl(0.05, 0.22, "dark", 1.2 + Math.cos((i / 6) * TAU) * 0.2, 1.36, -0.6 + Math.sin((i / 6) * TAU) * 0.2);
  }

  const consoleAt = k.console(2.6, 2.3);
  k.cabinet(2.6, -2.5);
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
const beamLine: Builder = (k, variant, name) => {
  const big = variant === "gantry";
  const reach = variant === "compact" ? 3.4 : 5.6;
  k.part("conveyor");
  k.conveyor(-reach, -0.9, 0, 1.3);
  k.conveyor(0.9, reach, 0, 1.3);
  const beam = k.beam(variant === "compact" ? 4.2 : 6.2, -1.0, 0.76, 0, big ? 0.9 : 0.5, big ? 0.45 : 0.3);
  k.fence([[-reach, -1.5], [-reach / 2, -1.5], [-1.2, -1.5]], 1.6);
  k.fence([[1.2, -1.5], [reach / 2, -1.5], [reach, -1.5]], 1.6);

  k.part("frame");
  const h = big ? 3.0 : 2.4;
  k.box(1.5, 0.3, 2.8, "dark", 0, 0.15, 0);
  k.feet([[-0.6, 1.25], [0.6, 1.25], [-0.6, -1.25], [0.6, -1.25]]);
  k.box(1.1, 0.25, 0.9, "dark", 0, 0.42, 0); // chip tray
  if (variant === "cantilever") {
    k.box(0.8, h, 0.7, "white", 0, h / 2 + 0.3, -1.25);
    k.box(0.7, 0.5, 2.2, "white", 0, h + 0.05, -0.3);
    k.box(0.72, 0.07, 2.2, "green", 0, h + 0.33, -0.3);
    k.nameplate(name, 1.3, 0.356, h + 0.05, -0.3, HALF);
  } else {
    k.box(0.9, h, 0.5, "white", 0, h / 2 + 0.3, 1.2);
    k.box(0.9, h, 0.5, "white", 0, h / 2 + 0.3, -1.2);
    k.box(1.0, 0.55, 2.9, "white", 0, h + 0.5, 0);
    k.box(1.02, 0.07, 2.9, "green", 0, h + 0.82, 0);
    k.hazard(0.92, 0.1, 0.06, 0, 0.36, 1.46);
    if (big) {
      k.nameplate(name, 1.7, 0.506, h + 0.48, 0, HALF);
    } else {
      // Enclosed cabin, as on the real lines: the beam passes under a fascia with the
      // model name, through a strip curtain; the long side has glazed sliding doors.
      const top = h + 0.92;
      const mid = (top + 0.3) / 2;
      const fascia = 1.95;
      [-1.28, 1.28].forEach((x) => {
        const out = Math.sign(x);
        k.box(0.05, top - 0.3, 0.86, "white", x, mid, 1.18);
        k.box(0.05, top - 0.3, 0.86, "white", x, mid, -1.18);
        k.box(0.05, top - fascia, 1.5, "white", x, (top + fascia) / 2, 0);
        [-0.36, 0.36].forEach((z) => {
          k.box(0.02, 0.3, 0.52, "dark", x + out * 0.02, fascia + 0.3, z);
          k.box(0.02, 0.22, 0.44, "smoke", x + out * 0.034, fascia + 0.3, z);
        });
        for (let i = 0; i < 10; i++) {
          const z = -0.675 + i * 0.15;
          const drop = Math.abs(z) < 0.3 ? 0.6 : 1.02; // shorter where the beam passes
          k.box(0.012, drop, 0.14, "curtain", x - out * 0.03, fascia - drop / 2, z);
        }
        k.nameplate(name, 1.3, x + out * 0.03, top - 0.4, 0, out * HALF);
      });
      k.box(2.6, top - 0.3, 0.05, "white", 0, mid, -1.61);
      // rear: electrical cabinet doors with vents, handles and warning labels
      [-0.86, 0, 0.86].forEach((x) => {
        k.box(0.012, top - 0.9, 0.012, "dark", x + 0.43, mid - 0.2, -1.64);
        k.box(0.03, 0.3, 0.03, "steel", x + 0.3, 1.5, -1.66);
        k.box(0.36, 0.2, 0.012, "dark", x, 0.75, -1.64);
        k.box(0.1, 0.1, 0.006, "yellow", x, 2.05, -1.638);
      });
      k.nameplate(name, 1.5, 0, top - 0.4, -1.64, Math.PI);
      k.box(2.6, 0.9, 0.05, "white", 0, 0.75, 1.61);
      k.box(2.6, top - 2.5, 0.05, "white", 0, (top + 2.5) / 2, 1.61);
      k.box(2.5, 1.3, 0.02, "smoke", 0, 1.85, 1.61);
      [-1.27, -0.43, 0.43, 1.27].forEach((x) => k.box(0.06, 1.3, 0.07, "dark", x, 1.85, 1.61));
      [-0.5, 0.36].forEach((x) => k.box(0.03, 0.36, 0.03, "steel", x, 1.8, 1.67));
      [-0.85, 0.85].forEach((x) => k.box(0.1, 0.1, 0.006, "yellow", x, 0.92, 1.638));
      k.box(2.7, 0.05, 3.32, "green", 0, top - 0.02, 0);
      k.box(2.62, 0.05, 3.24, "white", 0, top + 0.03, 0);
      [-0.78, 0, 0.78].forEach((x) => {
        k.arch(0.4, x, top + 0.05, 0.3, "z");
        k.box(0.24, 0.26, 0.3, "dark", x, top + 0.18, -0.32);
      });
    }
  }
  k.towerLight(0, h + 0.86, -1.3);
  if (big || variant === "cantilever") k.cableChain(-1.2, 1.2, h + 0.92, -0.3, "z");

  // spindles: one from above, plus one per side on multi-spindle lines
  const heads = k.part("heads");
  const top = h - 0.4;
  if (variant === "scribe") {
    ([[0, top + 0.3, 0, "y"], [0, 1.0, 0.75, "z"], [0, 1.0, -0.75, "z"], [0, 0.45, 0, "y"]] as [number, number, number, "y" | "z"][]).forEach(([x, y, z, axis]) => {
      k.box(0.3, 0.3, 0.3, "dark", x, y, z);
      k.cyl(0.03, 0.3, "hot", x, y - (axis === "y" ? 0.25 : 0), z * (axis === "z" ? 0.75 : 1), axis, 0.006);
    });
  } else {
    k.box(0.45, 0.7, 0.45, "dark", 0, top + 0.15, 0);
    k.motor(0, top + 0.72, 0, "y", 1.1);
    k.cyl(0.1, 0.45, "steel", 0, top - 0.4, 0);
    k.cyl(0.026, 0.22, "steel", 0, top - 0.72, 0, "y", 0.004);
    k.hose([[0.15, top + 0.5, 0.1], [0.3, top + 0.9, 0.2], [0.1, h + 0.9, -0.3]], 0.02);
    if (variant === "triple" || big) {
      [0.78, -0.78].forEach((z) => {
        k.box(0.45, 0.45, 0.5, "dark", 0, 1.0, z);
        k.cyl(0.1, 0.34, "steel", 0, 1.0, z * 0.62, "z");
        k.cyl(0.026, 0.16, "steel", 0, 1.0, z * 0.32, "z");
        k.motor(0, 1.0, z * 1.42, "z", 1);
      });
    }
    if (variant === "single" || variant === "cantilever") k.cyl(0.26, 0.12, "steel", 0, top + 0.15, 0.3, "z");
  }

  k.part("clamps");
  [-0.62, 0.62].forEach((x) => {
    k.box(0.2, 0.5, 0.3, "dark", x, 1.0, 0.42);
    k.box(0.2, 0.5, 0.3, "dark", x, 1.0, -0.42);
    k.cyl(0.05, 0.3, "orange", x, 1.05, 0.68, "z");
    k.cyl(0.05, 0.3, "orange", x, 1.05, -0.68, "z");
    k.box(0.24, 0.12, 1.5, "dark", x, 0.64, 0);
  });

  k.part("carriage");
  k.box(reach - 1, 0.16, 0.14, "white", -(reach + 1) / 2, 0.95, 1.05);
  k.box(reach - 1, 0.03, 0.05, "steel", -(reach + 1) / 2, 1.045, 1.05);
  const tug = new THREE.Group();
  k.add(tug);
  [k.box(0.5, 0.5, 0.5, "green", -3.0, 1.32, 1.05), k.box(0.3, 0.2, 0.7, "dark", -3.0, 1.1, 0.6), k.box(0.12, 0.3, 0.1, "steel", -3.0, 1.05, 0.22)].forEach((m) => tug.attach(m));
  k.cableChain(-reach, -1.4, 0.86, 1.28, "x");

  const consoleAt = k.console(1.9, 2.3);
  k.cabinet(1.9, -2.5);
  return {
    console: consoleAt,
    animate(time, _dt, live) {
      const shift = Math.sin(time * 0.35) * 0.9 * live;
      beam.position.x = -1.0 + shift;
      tug.position.x = shift;
      heads.position.y = -Math.max(0, Math.sin(time * 1.3)) * 0.12 * live;
    },
  };
};

/** Angle or flat bar fed through punching/drilling and shearing units. */
const angleLine: Builder = (k, variant, name) => {
  const flat = variant === "flat";
  k.part("conveyor");
  k.conveyor(-6.2, -1.1, 0, 0.7, 0.8);
  k.conveyor(2.4, 4.6, 0, 0.7, 0.8);
  const bar = new THREE.Group();
  k.add(bar);
  if (flat) {
    bar.attach(k.box(6.0, 0.03, 0.4, "plate", 0, 0.87, 0));
  } else {
    bar.attach(k.box(6.0, 0.03, 0.22, "plate", 0, 0.87, 0.1));
    bar.attach(k.box(6.0, 0.22, 0.03, "plate", 0, 0.97, 0));
  }
  bar.position.x = -2.4;
  // stock waiting on the loading table
  for (let i = 0; i < 4; i++) k.box(5.6, 0.04, 0.2, "plate", -3.6, 0.9, 0.9 + i * 0.28);
  [-5.6, -3.6, -1.6].forEach((x) => {
    k.box(0.1, 0.84, 1.3, "dark", x, 0.42, 1.25);
  });
  k.fence([[-6.4, -1.3], [-3.6, -1.3], [-1.2, -1.3]], 1.6);

  k.part("carriage");
  k.box(5.0, 0.14, 0.14, "white", -3.6, 1.05, -0.55);
  k.box(5.0, 0.03, 0.05, "steel", -3.6, 1.135, -0.55);
  const tug = new THREE.Group();
  k.add(tug);
  [k.box(0.5, 0.45, 0.45, "green", -4.6, 1.4, -0.55), k.box(0.28, 0.16, 0.5, "dark", -4.6, 1.1, -0.2)].forEach((m) => tug.attach(m));
  k.cableChain(-6.1, -1.2, 0.95, -0.78, "x");

  k.part("punch");
  k.box(1.5, 0.7, 1.3, "dark", -0.2, 0.35, 0);
  k.box(1.3, 1.5, 1.2, "white", -0.2, 1.45, -0.15);
  k.box(1.32, 0.07, 1.2, "green", -0.2, 2.1, -0.15);
  k.nameplate(name, 1.0, -0.2, 1.9, 0.456, 0);
  k.feet([[-0.85, 0.55], [0.45, 0.55], [-0.85, -0.55], [0.45, -0.55]]);
  if (flat) {
    k.cyl(0.1, 0.5, "steel", -0.2, 1.3, 0.3);
    k.cyl(0.026, 0.2, "steel", -0.2, 0.98, 0.3, "y", 0.004);
    k.motor(-0.2, 1.75, 0.3, "y", 0.9);
  } else {
    [-0.45, 0.05].forEach((x) => {
      k.cyl(0.13, 0.5, "orange", x, 1.25, 0.45).rotation.x = -0.75;
      k.cyl(0.13, 0.5, "orange", x, 1.25, 0.15).rotation.x = 0.75;
    });
  }
  const disc = k.cyl(0.18, 0.1, "steel", 0.42, 1.35, 0.5, "x");
  // hydraulic power unit with hoses up to the working units
  k.box(0.9, 0.7, 0.7, "orange", -0.2, 0.35, -1.6);
  k.motor(-0.2, 0.9, -1.6, "y", 1.2);
  k.hose([[-0.5, 0.7, -1.4], [-0.6, 1.4, -1.0], [-0.5, 2.0, -0.6]], 0.025);
  k.hose([[0.1, 0.7, -1.4], [0.2, 1.4, -1.0], [0.1, 2.0, -0.6]], 0.025);
  k.towerLight(-0.75, 2.14, -0.6);

  k.part("shear");
  k.box(1.1, 0.7, 1.2, "dark", 1.45, 0.35, 0);
  k.box(0.9, 1.3, 1.1, "white", 1.45, 1.35, -0.1);
  k.box(0.92, 0.07, 1.1, "green", 1.45, 1.9, -0.1);
  k.box(0.3, 0.6, 0.5, "steel", 1.45, 1.0, 0.5);
  k.box(0.06, 0.5, 0.52, "hot", 1.62, 1.0, 0.5);
  k.cyl(0.14, 0.5, "steel", 1.45, 1.6, 0.5);
  k.hazard(0.06, 0.6, 0.52, 1.28, 1.0, 0.5);

  const consoleAt = k.console(0.6, 2.0);
  k.cabinet(2.9, -1.6);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      const shift = Math.sin(time * 0.4) * 1.2 * live;
      bar.position.x = -2.4 + shift;
      tug.position.x = shift;
      disc.rotateY(dt * 0.6 * live);
    },
  };
};

/** Band saw with a tilting bow: KATANA. */
const bandSaw: Builder = (k, _variant, name) => {
  k.part("conveyor");
  k.conveyor(-4.6, -0.7, 0, 1.3);
  k.conveyor(0.7, 4.6, 0, 1.3);
  k.beam(6.0, -0.5, 0.76, 0);
  k.fence([[-4.7, -1.5], [-2.4, -1.5], [-0.9, -1.5]], 1.6);

  k.part("saw");
  k.box(1.2, 0.5, 2.6, "dark", 0, 0.25, 0);
  k.feet([[-0.5, 1.2], [0.5, 1.2], [-0.5, -1.2], [0.5, -1.2]]);
  k.box(0.9, 0.3, 0.5, "dark", 0, 0.15, 1.6); // chip bin
  const bow = new THREE.Group();
  k.add(bow);
  k.within(bow, () => {
    k.box(0.5, 0.9, 0.9, "white", 0, 1.9, 1.2);
    k.box(0.5, 0.9, 0.9, "white", 0, 1.9, -1.2);
    k.cyl(0.4, 0.06, "green", 0.27, 1.9, 1.2, "x");
    k.cyl(0.4, 0.06, "green", 0.27, 1.9, -1.2, "x");
    k.box(0.5, 0.4, 3.2, "white", 0, 2.45, 0);
    k.box(0.52, 0.07, 3.2, "green", 0, 2.68, 0);
    k.box(0.02, 1.2, 0.06, "steel", 0, 1.3, 0.5);
    k.box(0.02, 1.2, 0.06, "steel", 0, 1.3, -0.5);
    k.box(0.12, 0.2, 0.12, "dark", 0, 1.55, 0.5);
    k.box(0.12, 0.2, 0.12, "dark", 0, 1.55, -0.5);
    k.nameplate(name, 1.4, 0.256, 2.45, 0, HALF);
    k.motor(-0.45, 1.9, -1.2, "x", 1.2);
  });
  k.hose([[0.1, 1.5, 0.5], [0.4, 1.2, 0.9], [0.5, 0.5, 1.2]], 0.015);
  k.towerLight(0, 0.52, -1.25);

  k.part("clamps");
  [-0.5, 0.5].forEach((x) => {
    k.box(0.22, 0.55, 0.3, "orange", x, 1.03, 0.45);
    k.box(0.22, 0.55, 0.3, "orange", x, 1.03, -0.45);
    k.cyl(0.05, 0.35, "steel", x, 1.05, 0.75, "z");
    k.cyl(0.05, 0.35, "steel", x, 1.05, -0.75, "z");
  });

  const consoleAt = k.console(1.7, 2.2);
  k.cabinet(1.6, -2.4);
  return {
    console: consoleAt,
    animate(time, _dt, live) {
      bow.rotation.y = Math.sin(time * 0.25) * 0.5 * live;
      bow.position.y = -Math.max(0, Math.sin(time * 0.8)) * 0.35 * live;
    },
  };
};

/** Six-axis robot working on a section or handling parts: NOZOMI, SABRE, RP, RF, E-LEXINGTON. */
const robotCell: Builder = (k, variant, name) => {
  const handling = variant.startsWith("handling");
  k.part("conveyor");
  if (handling) {
    k.box(1.6, 0.9, 1.6, "dark", 2.0, 0.45, 0);
    k.box(1.2, 0.2, 1.2, "steel", 2.0, 1.0, 0);
    k.cyl(0.16, 0.5, "hot", 2.0, 1.35, 0);
    k.box(1.4, 0.7, 1.4, "white", -2.0, 0.35, 0);
    for (let i = 0; i < 6; i++) k.cyl(0.14, 0.4, "plate", -2.3 + (i % 3) * 0.3, 0.9, -0.2 + Math.floor(i / 3) * 0.4);
  } else {
    k.conveyor(-4.4, 4.4, 0, 1.3);
    k.beam(6.4, 0, 0.76, 0, 0.6, 0.34);
  }

  k.part("robot");
  let arm: THREE.Group | undefined;
  let sparks: ((dt: number, live: number) => void) | undefined;
  if (variant === "projector") {
    k.box(0.3, 3.4, 0.3, "white", 0, 1.7, -1.6);
    k.box(0.5, 0.05, 0.5, "dark", 0, 0.025, -1.6);
    k.box(0.3, 0.3, 1.9, "white", 0, 3.4, -0.75);
    k.box(0.5, 0.35, 0.5, "dark", 0, 3.15, 0);
    k.cyl(0.08, 0.1, "lampGreen", 0, 2.95, 0);
    k.nameplate(name, 1.2, 0.152, 3.4, -0.75, HALF);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.3, 1.9, 4, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2cc4a6, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    );
    cone.position.set(0, 2.05, 0);
    cone.rotation.y = Math.PI / 4;
    cone.raycast = () => {};
    k.add(cone);
    k.trash.push(cone.geometry, cone.material as THREE.Material);
  } else {
    const z = handling ? 0 : -1.5;
    k.box(1.0, 0.06, 1.0, "dark", 0, 0.03, z);
    k.cyl(0.42, 0.5, "dark", 0, 0.28, z);
    arm = new THREE.Group();
    arm.position.set(0, 0.5, z);
    k.add(arm);
    const lower = new THREE.Group();
    arm.add(lower);
    [k.cyl(0.3, 0.4, "yellow", 0, 0.7, z), k.cyl(0.24, 0.5, "dark", 0, 0.9, z, "x"), k.box(0.28, 1.5, 0.3, "yellow", 0, 1.5, z)].forEach((m) => lower.attach(m));
    const upper = new THREE.Group();
    upper.position.set(0, 1.75, 0);
    lower.add(upper);
    [
      k.cyl(0.2, 0.44, "dark", 0, 2.25, z, "x"),
      k.box(0.24, 0.24, 1.4, "yellow", 0, 2.25, z + 0.7),
      k.cyl(0.13, 0.3, "dark", 0, 2.25, z + 1.42, "z"),
      k.cyl(0.1, 0.3, "steel", 0, 2.25, z + 1.5, "z"),
      k.cyl(handling ? 0.16 : 0.04, handling ? 0.1 : 0.3, handling ? "dark" : "hot", 0, 2.05, z + 1.62),
    ].forEach((m) => upper.attach(m));
    // cable loom along the arm; `lower` sits at the arm base, so these are arm-local metres
    k.within(lower, () => k.hose([[0.17, 0.4, 0], [0.3, 1.1, 0.1], [0.2, 1.8, 0.2]], 0.025));
    arm.userData = { lower, upper };
    if (!handling) sparks = k.sparks(new THREE.Vector3(0, 1.45, 0.1), 1.37, 40);
  }

  k.part("cabin");
  if (!handling) k.fence([[-2.4, -2.4], [0, -2.4], [2.4, -2.4], [2.4, -1.0]], 2.1);
  else k.fence([[-3, 1.9], [-3, -1.9], [0, -1.9], [3, -1.9], [3, 1.9]], 1.9);
  if (variant !== "projector") k.nameplate(name, 1.1, 3.456, 1.2, -2.3, HALF);

  const consoleAt = k.console(3.0, 2.2);
  k.cabinet(3.2, -2.3);
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
const tunnel: Builder = (k, variant, name) => {
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
  k.nameplate(name, 1.6, 0, 2.3, 1.356, 0);
  // rubber curtains at the openings, inspection door with window
  [-1.5, 1.5].forEach((x) => {
    k.box(0.1, 0.5, 2.3, "dark", x, 2.75, 0);
    for (let i = 0; i < 9; i++) k.box(0.03, 1.5, 0.22, "rubber", x, 1.75, -0.96 + i * 0.24);
  });
  k.box(0.9, 1.3, 0.04, "dark", -0.7, 1.55, 1.36);
  k.box(0.5, 0.4, 0.02, "glass", -0.7, 1.85, 1.39);
  k.box(0.04, 0.2, 0.05, "steel", -0.32, 1.5, 1.4);
  k.hazard(3.02, 0.1, 0.06, 0, 0.52, 1.36);
  k.towerLight(1.3, 3.15, 1.2);

  k.part("units");
  const turbines: THREE.Mesh[] = [];
  if (blast) {
    [[-0.7, 1.45], [0.7, 1.45], [-0.7, -1.45], [0.7, -1.45]].forEach(([x, z]) => {
      turbines.push(k.cyl(0.34, 0.3, "steel", x, 1.9, z, "z"));
      k.motor(x, 1.9, z + Math.sign(z) * 0.42, "z", 1.5);
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
  k.box(1.42, 0.07, 1.22, "green", 0.4, 2.2, -2.6);
  k.cyl(0.28, 1.2, "steel", 0.4, 3.0, -2.6);
  k.hose([[0.4, 3.5, -2.6], [0.4, 3.9, -2.0], [0.4, 3.6, -1.0], [0.4, 3.2, -0.4]], 0.24, "steel");
  k.cyl(0.5, 0.8, "dark", -0.9, 0.9, -2.6, "y", 0.12);
  if (blast) {
    k.box(0.5, 4.4, 0.5, "white", -1.2, 2.2, -1.75); // bucket elevator returning the abrasive
    k.motor(-1.2, 4.5, -1.75, "x", 1.2);
  }
  k.fence([[-5.2, -1.4], [-3.2, -1.4], [-1.8, -1.4]], 1.6);

  const consoleAt = k.console(2.4, 2.3);
  k.cabinet(2.9, -2.6);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      load.position.x = -3.4 + ((time * 0.5) % 7) * live;
      turbines.forEach((turbine) => turbine.rotateY(dt * 4 * live));
    },
  };
};

/** Forging presses: screw (DD, PVX), mechanical (MF), hydraulic (HF, HF X), four-column (HF 4C). */
const press: Builder = (k, variant, name) => {
  const four = variant === "four-column";
  k.part("frame");
  k.box(3.4, 0.12, 3.0, "dark", 0, 0.06, 0); // foundation plate
  k.box(2.6, 0.9, 2.2, "dark", 0, 0.57, 0);
  k.hazard(2.62, 0.12, 0.06, 0, 0.2, 1.12);
  if (four) {
    [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]].forEach(([x, z]) => {
      k.cyl(0.16, 3.0, "steel", x, 2.52, z);
      k.cyl(0.24, 0.16, "dark", x, 1.1, z);
      k.cyl(0.24, 0.16, "dark", x, 3.95, z);
    });
  } else {
    k.box(0.6, 3.0, 1.9, "white", -1.0, 2.52, 0);
    k.box(0.6, 3.0, 1.9, "white", 1.0, 2.52, 0);
    [-1.0, 1.0].forEach((x) => k.box(0.05, 2.2, 0.12, "steel", x - Math.sign(x) * 0.32, 2.4, 0.7));
  }
  k.box(2.6, 0.9, 2.0, "white", 0, 4.47, 0);
  k.box(2.62, 0.08, 2.0, "green", 0, 4.1, 0);
  k.nameplate(name, 1.7, 0, 4.5, 1.006, 0);
  // service platform with handrail and ladder
  k.box(3.2, 0.06, 0.9, "steel", 0, 4.95, -1.4);
  const deck = new THREE.Group();
  deck.position.y = 4.98;
  k.add(deck);
  k.within(deck, () => k.fence([[-1.6, -1.85], [0, -1.85], [1.6, -1.85]], 1.0));
  k.box(0.05, 4.9, 0.05, "yellow", 1.75, 2.5, -1.2);
  k.box(0.05, 4.9, 0.05, "yellow", 1.75, 2.5, -1.6);
  for (let y = 0.4; y < 4.9; y += 0.32) k.box(0.03, 0.03, 0.4, "yellow", 1.75, y, -1.4);
  // light curtains guarding the die space
  [-1.45, 1.45].forEach((x) => {
    k.box(0.07, 1.5, 0.07, "yellow", x, 1.8, 1.25);
    k.box(0.02, 1.3, 0.03, "lampRed", x - Math.sign(x) * 0.04, 1.8, 1.25);
  });
  k.towerLight(-1.2, 4.92, 0.9);

  const ram = k.part("ram");
  k.box(1.3, 0.8, 1.5, "dark", 0, 2.72, 0);
  k.box(0.9, 0.25, 1.0, "steel", 0, 2.2, 0);
  k.box(0.08, 0.7, 0.2, "orange", -0.68, 2.72, 0.5);
  k.box(0.08, 0.7, 0.2, "orange", 0.68, 2.72, 0.5);
  k.box(1.32, 0.12, 1.52, "orange", 0, 3.05, 0);

  k.part("drive");
  let wheel: THREE.Mesh | undefined;
  if (variant === "screw") {
    wheel = k.cyl(1.25, 0.35, "green", 0, 5.22, 0);
    k.cyl(1.27, 0.08, "dark", 0, 5.22, 0);
    k.cyl(0.6, 0.3, "dark", 0, 5.54, 0);
    k.cyl(0.22, 1.2, "steel", 0, 3.72, 0);
    for (let i = 0; i < 6; i++) k.cyl(0.235, 0.05, "dark", 0, 3.25 + i * 0.18, 0);
  } else if (variant === "mechanical") {
    wheel = k.cyl(1.0, 0.3, "green", 1.5, 4.47, 0, "x");
    k.motor(-1.9, 4.47, 0, "x", 2.6);
    k.cyl(0.2, 3.2, "steel", 0, 4.47, 0, "x");
  } else {
    k.cyl(0.55, 1.3, "steel", 0, 5.57, 0);
    k.cyl(0.6, 0.12, "dark", 0, 4.98, 0);
    k.box(1.6, 0.8, 1.2, "green", 0, 6.47, 0);
    k.motor(-0.4, 7.05, 0, "x", 1.6);
    k.cyl(0.18, 1.2, "steel", 0, 3.72, 0);
    k.hose([[0.5, 6.1, 0.4], [0.9, 5.6, 0.6], [0.6, 5.2, 0.5]], 0.04);
    k.hose([[-0.5, 6.1, 0.4], [-0.9, 5.6, 0.6], [-0.6, 5.2, 0.5]], 0.04);
  }

  k.part("dies");
  k.box(1.1, 0.35, 1.2, "steel", 0, 1.2, 0);
  k.box(1.3, 0.08, 1.4, "dark", 0, 1.06, 0);
  k.cyl(0.2, 0.22, "hot", 0, 1.48, 0);
  const glow = new THREE.PointLight(0xff7a3d, 4, 4, 2);
  glow.position.set(0, 1.75, 0.5);
  k.add(glow);

  const consoleAt = k.console(2.9, 1.9);
  k.cabinet(-3.0, -1.0);
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
const shear: Builder = (k, variant, name) => {
  k.part("base");
  k.box(2.4, 0.8, 2.0, "dark", 0, 0.4, 0);
  k.box(1.9, 1.7, 1.7, "white", 0, 1.65, 0);
  k.box(1.92, 0.08, 1.7, "green", 0, 2.25, 0);
  k.nameplate(name, 1.3, 0, 2.05, 0.856, 0);
  k.feet([[-1.1, 0.9], [1.1, 0.9], [-1.1, -0.9], [1.1, -0.9]]);
  k.hazard(2.42, 0.1, 0.06, 0, 0.75, 1.02);
  k.towerLight(-0.8, 2.3, -0.7);

  const head = k.part("head");
  k.box(0.5, 1.2, 0.9, "dark", 1.05, 1.5, 0);
  k.box(0.08, 0.7, 0.6, "steel", 1.34, 1.45, 0);
  k.box(0.02, 0.5, 0.5, "glass", 1.5, 1.5, 0);
  let fly: THREE.Mesh | undefined;
  if (variant === "hydraulic") {
    k.cyl(0.26, 0.9, "steel", 1.05, 2.55, 0);
    k.hose([[1.05, 3.0, 0.1], [0.6, 3.1, 0.3], [0.2, 2.6, 0.4]], 0.035);
  } else {
    fly = k.cyl(0.75, 0.25, "green", -0.2, 1.3, 1.0, "z");
    k.cyl(0.77, 0.06, "dark", -0.2, 1.3, 1.0, "z");
    k.motor(-0.2, 2.6, 0.6, "z", 1.8);
    k.box(0.12, 1.3, 0.04, "rubber", -0.2, 1.95, 1.0);
  }

  k.part("feed");
  k.conveyor(-5.0, -1.25, 0, 0.8, 1.35);
  const bars = new THREE.Group();
  k.add(bars);
  [-0.18, 0, 0.18].forEach((z) => bars.attach(k.cyl(0.08, 3.6, variant === "hydraulic" ? "hot" : "steel", -3.0, 1.49, z, "x")));
  // bar bundle waiting on the rack
  for (let i = 0; i < 7; i++) k.cyl(0.08, 3.4, "steel", -3.2, 0.5 + (i % 2) * 0.14, 1.1 + i * 0.09, "x");
  [-4.6, -3.2, -1.8].forEach((x) => k.box(0.1, 0.4, 1.0, "dark", x, 0.2, 1.4));

  k.part("chute");
  const slide = k.box(1.6, 0.06, 0.8, "steel", 2.2, 1.0, 0);
  slide.rotation.z = -0.45;
  k.box(1.0, 0.7, 1.0, "dark", 3.2, 0.35, 0);
  k.box(0.9, 0.04, 0.9, "steel", 3.2, 0.72, 0);
  k.box(0.7, 0.1, 0.8, "white", 2.3, 0.6, 1.1);
  k.box(0.3, 0.3, 0.06, "dark", 2.3, 0.9, 1.5);
  const billet = k.cyl(0.08, 0.3, "steel", 1.6, 1.3, 0, "x");

  const consoleAt = k.console(1.4, 2.3);
  k.cabinet(-1.8, -1.9);
  return {
    console: consoleAt,
    animate(time, dt, live) {
      const cycle = (time * 0.9) % 1;
      head.position.y = -Math.pow(Math.max(0, Math.sin(time * 0.9 * TAU)), 8) * 0.18 * live;
      bars.position.x = cycle * 0.3 * live;
      billet.position.set(1.6 + cycle * 1.4 * live, 1.3 - cycle * 0.7 * live, 0);
      fly?.rotateY(dt * 3 * live);
    },
  };
};

/** Disc saws for sections, tubes and bars: S, SP, VS. */
const discSaw: Builder = (k, variant, name) => {
  const vertical = variant === "vertical";
  k.part("base");
  k.box(2.2, 0.9, 1.8, "dark", 0, 0.45, 0);
  k.box(1.8, 0.1, 1.6, "white", 0, 0.95, 0);
  k.feet([[-1.0, 0.8], [1.0, 0.8], [-1.0, -0.8], [1.0, -0.8]]);
  k.box(0.7, 0.5, 0.6, "dark", 0, 0.25, 1.25); // chip bin
  k.hazard(2.22, 0.1, 0.06, 0, 0.85, 0.92);

  const saw = k.part("saw");
  const top = vertical ? 1.7 : 1.9;
  k.box(0.7, 1.4, 0.9, "white", 0, top, -0.75);
  k.box(0.72, 0.07, 0.9, "green", 0, top + 0.6, -0.75);
  k.nameplate(name, 0.6, 0, top + 0.35, -0.296, 0);
  const disc = k.cyl(0.6, 0.03, "steel", 0, vertical ? 0.95 : 1.75, -0.05, "x");
  k.cyl(0.14, 0.3, "dark", 0.14, vertical ? 0.95 : 1.75, -0.05, "x");
  if (!vertical) {
    k.box(0.1, 0.7, 1.3, "green", -0.08, 2.1, -0.05); // blade guard
    k.box(0.02, 0.5, 1.0, "glass", 0.2, 2.0, -0.05);
  }
  k.motor(-0.45, top + 0.2, -0.75, "x", 1.6);
  k.hose([[0.2, top, -0.4], [0.35, 1.5, -0.2], [0.25, 1.35, 0]], 0.014);
  k.towerLight(0.25, top + 0.64, -1.1);

  k.part("feed");
  k.conveyor(-4.4, -1.2, 0.05, 0.8, 1.0);
  k.conveyor(1.2, 3.4, 0.05, 0.8, 1.0);
  const bar = variant === "horizontal" ? k.cyl(0.14, 5.0, "plate", -1.6, 1.2, 0.05, "x") : k.box(5.0, 0.3, 0.3, "plate", -1.6, 1.21, 0.05);
  [-0.5, 0.5].forEach((x) => {
    k.box(0.2, 0.5, 0.25, "dark", x, 1.25, 0.45);
    k.cyl(0.05, 0.3, "steel", x, 1.3, 0.7, "z");
  });
  k.fence([[-4.5, -0.8], [-2.6, -0.8], [-1.3, -0.8]], 1.5);

  const consoleAt = k.console(1.6, 2.0);
  k.cabinet(-1.9, -1.9);
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
  "angle-line": (k, _variant, name) => angleLine(k, "angle", name),
  "flat-line": (k, _variant, name) => angleLine(k, "flat", name),
  "band-saw": bandSaw,
  "robot-cell": robotCell,
  tunnel,
  press,
  shear,
  "disc-saw": discSaw,
};
