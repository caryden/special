/**
 * Color difference metrics: CIE76 (Euclidean in Lab) and CIEDE2000.
 *
 * CIEDE2000 is the most perceptually accurate color difference formula,
 * with corrections for lightness, chroma, and hue weighting.
 *
 * @node delta-e
 * @depends-on color-types, lab-d65, oklch
 * @contract delta-e.test.ts
 * @provenance CIE 15:2004 (CIE76); Sharma et al. 2005 (CIEDE2000)
 */

import type { LabD65, Oklch } from "./color-types.ts";

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

/**
 * CIE76 color difference (Euclidean distance in CIELAB).
 * Simple but not perceptually uniform for large differences.
 */
export function deltaE76(a: LabD65, b: LabD65): number {
  const dL = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * CIEDE2000 color difference.
 * Perceptually uniform metric with lightness, chroma, and hue weighting.
 *
 * @provenance Sharma, Wu, Dalal, "The CIEDE2000 Color-Difference Formula", 2005
 */
export function deltaE2000(
  lab1: LabD65,
  lab2: LabD65,
  kL: number = 1,
  kC: number = 1,
  kH: number = 1,
): number {
  const L1 = lab1.l, a1 = lab1.a, b1 = lab1.b;
  const L2 = lab2.l, a2 = lab2.a, b2 = lab2.b;

  // Step 1: Calculate C'ab and h'ab
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;

  const Cab7 = Math.pow(Cab, 7);
  const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + 6103515625))); // 25^7

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = Math.atan2(b1, a1p) * RAD_TO_DEG;
  if (h1p < 0) h1p += 360;

  let h2p = Math.atan2(b2, a2p) * RAD_TO_DEG;
  if (h2p < 0) h2p += 360;

  // Step 2: Calculate ΔL', ΔC', ΔH'
  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * DEG_TO_RAD);

  // Step 3: Calculate CIEDE2000
  const Lp = (L1 + L2) / 2;
  const Cp = (C1p + C2p) / 2;

  let hp: number;
  if (C1p * C2p === 0) {
    hp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hp = (h1p + h2p + 360) / 2;
  } else {
    hp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos((hp - 30) * DEG_TO_RAD) +
    0.24 * Math.cos(2 * hp * DEG_TO_RAD) +
    0.32 * Math.cos((3 * hp + 6) * DEG_TO_RAD) -
    0.20 * Math.cos((4 * hp - 63) * DEG_TO_RAD);

  const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;

  const Cp7 = Math.pow(Cp, 7);
  const RT =
    -2 *
    Math.sqrt(Cp7 / (Cp7 + 6103515625)) *
    Math.sin(60 * DEG_TO_RAD * Math.exp(-Math.pow((hp - 275) / 25, 2)));

  const dLpSL = dLp / (kL * SL);
  const dCpSC = dCp / (kC * SC);
  const dHpSH = dHp / (kH * SH);

  return Math.sqrt(
    dLpSL * dLpSL + dCpSC * dCpSC + dHpSH * dHpSH + RT * dCpSC * dHpSH,
  );
}

/**
 * Oklch color difference (Euclidean distance in Oklch space).
 * Simple perceptual metric using Oklab's improved uniformity.
 */
export function deltaEOk(a: Oklch, b: Oklch): number {
  const dL = a.l - b.l;
  // Convert polar (C, H) to Cartesian (a, b) for Euclidean distance
  const hRad1 = a.h * DEG_TO_RAD;
  const hRad2 = b.h * DEG_TO_RAD;
  const da = a.c * Math.cos(hRad1) - b.c * Math.cos(hRad2);
  const db = a.c * Math.sin(hRad1) - b.c * Math.sin(hRad2);
  return Math.sqrt(dL * dL + da * da + db * db);
}
