import { describe, expect, test } from 'bun:test';
import {
  tuneZieglerNichols,
  tuneZieglerNicholsUltimate,
  tuneCohenCoon,
  tuneTyreusLuyben,
  tuneSIMC,
  tuneLambda,
  tuneIMC,
  tune,
} from './pid-tuning-rules.ts';
import type {
  FOPDTModel,
  UltimateGainParams,
  PIDGains,
} from './result-types.ts';

// ---------------------------------------------------------------------------
// Test models
// ---------------------------------------------------------------------------

/** Standard test model: moderate dead time */
const M1: FOPDTModel = { K: 1, tau: 10, theta: 2 };
/** Alternative model: faster, lower dead time */
const M2: FOPDTModel = { K: 2, tau: 5, theta: 1 };
/** Ultimate gain params */
const U1: UltimateGainParams = { Ku: 10, Tu: 4 };

const TOL = 1e-3;

function expectGains(actual: PIDGains, kp: number, ki: number, kd: number): void {
  expect(actual.kp).toBeCloseTo(kp, 3);
  expect(actual.ki).toBeCloseTo(ki, 3);
  expect(actual.kd).toBeCloseTo(kd, 3);
}

// ---------------------------------------------------------------------------
// Ziegler-Nichols open-loop
// ---------------------------------------------------------------------------

describe('tuneZieglerNichols (open-loop)', () => {
  test('P controller (M1)', () => {
    // Kp = tau/(K*theta) = 10/(1*2) = 5.0
    const g = tuneZieglerNichols(M1, 'P');
    expectGains(g, 5.0, 0, 0);
  });

  test('PI controller (M1)', () => {
    // Kp = 0.9*10/(1*2) = 4.5, Ti = 2/0.3 = 6.667
    // ki = 4.5/6.667 = 0.675
    const g = tuneZieglerNichols(M1, 'PI');
    expectGains(g, 4.5, 4.5 / (2 / 0.3), 0);
  });

  test('PID controller (M1) - cross-validated', () => {
    // Kp = 1.2*10/(1*2) = 6.0, Ti = 2*2 = 4.0, Td = 0.5*2 = 1.0
    // ki = 6.0/4.0 = 1.5, kd = 6.0*1.0 = 6.0
    const g = tuneZieglerNichols(M1, 'PID');
    expectGains(g, 6.0, 1.5, 6.0);
  });

  test('PID controller (M2)', () => {
    // Kp = 1.2*5/(2*1) = 3.0, Ti = 2*1 = 2.0, Td = 0.5*1 = 0.5
    // ki = 3.0/2.0 = 1.5, kd = 3.0*0.5 = 1.5
    const g = tuneZieglerNichols(M2, 'PID');
    expectGains(g, 3.0, 1.5, 1.5);
  });
});

// ---------------------------------------------------------------------------
// Ziegler-Nichols ultimate gain
// ---------------------------------------------------------------------------

describe('tuneZieglerNicholsUltimate', () => {
  test('P controller', () => {
    // Kp = 0.5*10 = 5.0
    const g = tuneZieglerNicholsUltimate(U1, 'P');
    expectGains(g, 5.0, 0, 0);
  });

  test('PI controller', () => {
    // Kp = 0.45*10 = 4.5, Ti = 4/1.2 = 3.333
    // ki = 4.5/3.333 = 1.35
    const g = tuneZieglerNicholsUltimate(U1, 'PI');
    expectGains(g, 4.5, 4.5 / (4 / 1.2), 0);
  });

  test('PID controller - cross-validated', () => {
    // Kp = 0.6*10 = 6.0, Ti = 4/2 = 2.0, Td = 4/8 = 0.5
    // ki = 6.0/2.0 = 3.0, kd = 6.0*0.5 = 3.0
    const g = tuneZieglerNicholsUltimate(U1, 'PID');
    expectGains(g, 6.0, 3.0, 3.0);
  });
});

// ---------------------------------------------------------------------------
// Cohen-Coon
// ---------------------------------------------------------------------------

describe('tuneCohenCoon', () => {
  // r = theta/tau = 2/10 = 0.2

  test('P controller (M1)', () => {
    // Kp = (1/(1*0.2)) * (1 + 0.2/3) = 5 * 1.0667 = 5.333
    const g = tuneCohenCoon(M1, 'P');
    expectGains(g, 5 * (1 + 0.2 / 3), 0, 0);
  });

  test('PI controller (M1)', () => {
    // Kp = (1/(1*0.2)) * (0.9 + 0.2/12) = 5 * 0.9167 = 4.583
    // Ti = 2 * (30 + 3*0.2) / (9 + 20*0.2) = 2 * 30.6 / 13 = 4.708
    const kp = 5 * (0.9 + 0.2 / 12);
    const ti = 2 * (30 + 3 * 0.2) / (9 + 20 * 0.2);
    const g = tuneCohenCoon(M1, 'PI');
    expectGains(g, kp, kp / ti, 0);
  });

  test('PID controller (M1) - cross-validated', () => {
    // Kp = (1/(1*0.2)) * (4/3 + 0.2/4) = 5 * (1.333+0.05) = 6.917
    // Ti = 2*(32+6*0.2)/(13+8*0.2) = 2*33.2/14.6 = 4.548
    // Td = 2*4/(11+2*0.2) = 8/11.4 = 0.702
    const kp = 5 * (4 / 3 + 0.2 / 4);
    const ti = 2 * (32 + 6 * 0.2) / (13 + 8 * 0.2);
    const td = 2 * 4 / (11 + 2 * 0.2);
    const g = tuneCohenCoon(M1, 'PID');
    expectGains(g, kp, kp / ti, kp * td);
  });

  test('PID controller (M2)', () => {
    // r = 1/5 = 0.2 (same ratio, different scale)
    // Kp = (1/(2*0.2)) * (4/3 + 0.2/4) = 2.5 * 1.383 = 3.458
    const r = 1 / 5;
    const kp = (1 / (2 * r)) * (4 / 3 + r / 4);
    const ti = 1 * (32 + 6 * r) / (13 + 8 * r);
    const td = 1 * 4 / (11 + 2 * r);
    const g = tuneCohenCoon(M2, 'PID');
    expectGains(g, kp, kp / ti, kp * td);
  });
});

// ---------------------------------------------------------------------------
// Tyreus-Luyben
// ---------------------------------------------------------------------------

describe('tuneTyreusLuyben', () => {
  test('P-only throws error', () => {
    expect(() => tuneTyreusLuyben(U1, 'P')).toThrow(
      'Tyreus-Luyben method does not define P-only tuning rules',
    );
  });

  test('PI controller', () => {
    // Kp = 10/3.2 = 3.125, Ti = 2.2*4 = 8.8
    // ki = 3.125/8.8 = 0.355
    const g = tuneTyreusLuyben(U1, 'PI');
    expectGains(g, 10 / 3.2, (10 / 3.2) / (2.2 * 4), 0);
  });

  test('PID controller - cross-validated', () => {
    // Kp = 10/2.2 = 4.545, Ti = 2.2*4 = 8.8, Td = 4/6.3 = 0.635
    // ki = 4.545/8.8 = 0.516, kd = 4.545*0.635 = 2.886
    const kp = 10 / 2.2;
    const ti = 2.2 * 4;
    const td = 4 / 6.3;
    const g = tuneTyreusLuyben(U1, 'PID');
    expectGains(g, kp, kp / ti, kp * td);
  });
});

// ---------------------------------------------------------------------------
// SIMC
// ---------------------------------------------------------------------------

describe('tuneSIMC', () => {
  test('P-only throws error', () => {
    expect(() => tuneSIMC(M1, 'P')).toThrow(
      'SIMC method does not define P-only tuning rules',
    );
  });

  test('PI controller (M1, default tau_c) - cross-validated', () => {
    // tc = max(10, 8*2) = max(10,16) = 16
    // Kp = 10/(1*(16+2)) = 10/18 = 0.556
    // Ti = min(10, 4*(16+2)) = min(10, 72) = 10
    // ki = 0.556/10 = 0.0556
    const g = tuneSIMC(M1, 'PI');
    expectGains(g, 10 / 18, (10 / 18) / 10, 0);
  });

  test('PID controller (M1, default tau_c)', () => {
    // Same kp, ti as PI; Td = theta/2 = 1
    // kd = (10/18)*1 = 0.556
    const g = tuneSIMC(M1, 'PID');
    expectGains(g, 10 / 18, (10 / 18) / 10, (10 / 18) * 1);
  });

  test('PI controller with custom tau_c', () => {
    // tau_c = 5 => Kp = 10/(1*(5+2)) = 10/7 = 1.429
    // Ti = min(10, 4*7) = min(10,28) = 10
    const g = tuneSIMC(M1, 'PI', 5);
    expectGains(g, 10 / 7, (10 / 7) / 10, 0);
  });

  test('PI controller (M2, default tau_c)', () => {
    // tc = max(5, 8*1) = 8
    // Kp = 5/(2*(8+1)) = 5/18 = 0.278
    // Ti = min(5, 4*9) = min(5,36) = 5
    const g = tuneSIMC(M2, 'PI');
    expectGains(g, 5 / 18, (5 / 18) / 5, 0);
  });
});

// ---------------------------------------------------------------------------
// Lambda tuning
// ---------------------------------------------------------------------------

describe('tuneLambda', () => {
  test('P-only throws error', () => {
    expect(() => tuneLambda(M1, 'P')).toThrow(
      'Lambda tuning method does not define P-only tuning rules',
    );
  });

  test('PI controller (M1, default lambda) - cross-validated', () => {
    // lam = 3*2 = 6
    // Kp = 10/(1*(6+2)) = 10/8 = 1.25
    // Ti = 10
    // ki = 1.25/10 = 0.125
    const g = tuneLambda(M1, 'PI');
    expectGains(g, 1.25, 0.125, 0);
  });

  test('PID controller (M1, default lambda)', () => {
    // Same kp, ti; Td = theta/2 = 1
    // kd = 1.25*1 = 1.25
    const g = tuneLambda(M1, 'PID');
    expectGains(g, 1.25, 0.125, 1.25);
  });

  test('PI controller with custom lambda', () => {
    // lambda = 10 => Kp = 10/(1*(10+2)) = 10/12 = 0.833
    // Ti = 10, ki = 0.833/10 = 0.0833
    const g = tuneLambda(M1, 'PI', 10);
    expectGains(g, 10 / 12, (10 / 12) / 10, 0);
  });

  test('PID controller (M2, default lambda)', () => {
    // lam = 3*1 = 3; Kp = 5/(2*(3+1)) = 5/8 = 0.625
    // Ti = 5, Td = 0.5; ki = 0.625/5 = 0.125, kd = 0.625*0.5 = 0.3125
    const g = tuneLambda(M2, 'PID');
    expectGains(g, 0.625, 0.125, 0.3125);
  });
});

// ---------------------------------------------------------------------------
// IMC
// ---------------------------------------------------------------------------

describe('tuneIMC', () => {
  test('P-only throws error', () => {
    expect(() => tuneIMC(M1, 'P')).toThrow(
      'IMC tuning method does not define P-only tuning rules',
    );
  });

  test('PI controller (M1, default lambda) - cross-validated', () => {
    // lam = max(0.25*10, 0.2*2) = max(2.5, 0.4) = 2.5
    // Kp = (10+1)/(1*(2.5+1)) = 11/3.5 = 3.143
    // Ti = 10+1 = 11; ki = 3.143/11 = 0.2857
    const g = tuneIMC(M1, 'PI');
    expectGains(g, 11 / 3.5, (11 / 3.5) / 11, 0);
  });

  test('PID controller (M1, default lambda)', () => {
    // lam = 2.5
    // Kp = (2*10+2)/(1*2*(2.5+2)) = 22/9 = 2.444
    // Ti = 10+1 = 11; Td = 10*2/(2*10+2) = 20/22 = 0.909
    // ki = 2.444/11 = 0.222; kd = 2.444*0.909 = 2.222
    const kp = 22 / 9;
    const ti = 11;
    const td = 20 / 22;
    const g = tuneIMC(M1, 'PID');
    expectGains(g, kp, kp / ti, kp * td);
  });

  test('PI controller with custom lambda', () => {
    // lambda = 5 => Kp = 11/(1*(5+1)) = 11/6 = 1.833
    // Ti = 11; ki = 1.833/11 = 0.1667
    const g = tuneIMC(M1, 'PI', 5);
    expectGains(g, 11 / 6, (11 / 6) / 11, 0);
  });

  test('PID controller (M2, default lambda)', () => {
    // lam = max(0.25*5, 0.2*1) = max(1.25, 0.2) = 1.25
    // Kp = (2*5+1)/(2*2*(1.25+1)) = 11/(2*2*2.25) = 11/9 = 1.222
    // Ti = 5+0.5 = 5.5; Td = 5*1/(2*5+1) = 5/11 = 0.4545
    // ki = 1.222/5.5 = 0.222; kd = 1.222*0.4545 = 0.556
    const kp = 11 / 9;
    const ti = 5.5;
    const td = 5 / 11;
    const g = tuneIMC(M2, 'PID');
    expectGains(g, kp, kp / ti, kp * td);
  });
});

// ---------------------------------------------------------------------------
// tune dispatcher
// ---------------------------------------------------------------------------

describe('tune dispatcher', () => {
  test('routes ziegler-nichols with FOPDTModel to open-loop', () => {
    const direct = tuneZieglerNichols(M1, 'PID');
    const dispatched = tune(M1, 'ziegler-nichols', 'PID');
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes ziegler-nichols with UltimateGainParams to ultimate', () => {
    const direct = tuneZieglerNicholsUltimate(U1, 'PID');
    const dispatched = tune(U1, 'ziegler-nichols', 'PID');
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes cohen-coon', () => {
    const direct = tuneCohenCoon(M1, 'PID');
    const dispatched = tune(M1, 'cohen-coon', 'PID');
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes tyreus-luyben', () => {
    const direct = tuneTyreusLuyben(U1, 'PID');
    const dispatched = tune(U1, 'tyreus-luyben', 'PID');
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes simc with default tau_c', () => {
    const direct = tuneSIMC(M1, 'PI');
    const dispatched = tune(M1, 'simc', 'PI');
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes simc with custom tau_c', () => {
    const direct = tuneSIMC(M1, 'PI', 5);
    const dispatched = tune(M1, 'simc', 'PI', { tau_c: 5 });
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes lambda with default', () => {
    const direct = tuneLambda(M1, 'PI');
    const dispatched = tune(M1, 'lambda', 'PI');
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes lambda with custom', () => {
    const direct = tuneLambda(M1, 'PI', 10);
    const dispatched = tune(M1, 'lambda', 'PI', { lambda: 10 });
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes imc with default', () => {
    const direct = tuneIMC(M1, 'PI');
    const dispatched = tune(M1, 'imc', 'PI');
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });

  test('routes imc with custom lambda', () => {
    const direct = tuneIMC(M1, 'PI', 5);
    const dispatched = tune(M1, 'imc', 'PI', { lambda: 5 });
    expectGains(dispatched, direct.kp, direct.ki, direct.kd);
  });
});

// ---------------------------------------------------------------------------
// Error cases for dispatcher
// ---------------------------------------------------------------------------

describe('tune dispatcher error cases', () => {
  test('tyreus-luyben P-only throws via dispatcher', () => {
    expect(() => tune(U1, 'tyreus-luyben', 'P')).toThrow();
  });

  test('simc P-only throws via dispatcher', () => {
    expect(() => tune(M1, 'simc', 'P')).toThrow();
  });

  test('lambda P-only throws via dispatcher', () => {
    expect(() => tune(M1, 'lambda', 'P')).toThrow();
  });

  test('imc P-only throws via dispatcher', () => {
    expect(() => tune(M1, 'imc', 'P')).toThrow();
  });
});
