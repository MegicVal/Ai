import type { ProceduralMachine } from "../types";
import { gemini } from "./gemini";

/** Machines modelled in code, keyed by machine slug. */
export const proceduralMachines: Record<string, ProceduralMachine> = { gemini };
