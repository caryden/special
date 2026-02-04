import { describe, expect, test } from 'bun:test';
import { pidStep, pidSequence } from './pid.ts';
import {
  defaultPIDConfig,
  initialPIDState,
} from './result-types.ts';
import type { PIDConfig, PIDState } from './result-types.ts';

// ---------------------------------------------------------------------------
// 1. Proportional only
// ---------------------------------------------------------------------------
describe('P-only controller', () => {
  const config = defaultPIDConfig({ gains: { kp: 2, ki: 0, kd: 0 } });
  const state = initialPIDState();

  test('positive error produces proportional output', () => {
    const r = pidStep(5, state, config);
    expect(r.output).toBeCloseTo(10);
    expect(r.terms.p).toBeCloseTo(10);
    expect(r.terms.i).toBeCloseTo(0);
    expect(r.terms.d).toBeCloseTo(0);
  });

  test('negative error produces negative output', () => {
    const r = pidStep(-3, state, config);
    expect(r.output).toBeCloseTo(-6);
  });

  test('zero error produces zero output', () => {
    const r = pidStep(0, state, config);
    expect(r.output).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Integral accumulation
// ---------------------------------------------------------------------------
describe('integral accumulation', () => {
  const config = defaultPIDConfig({
    gains: { kp: 0, ki: 1, kd: 0 },
    sampleTime: 1,
  });

  test('integral grows over multiple steps with constant error', () => {
    let state = initialPIDState();
    const r1 = pidStep(2, state, config);
    expect(r1.terms.i).toBeCloseTo(2); // 0 + 1*2*1
    const r2 = pidStep(2, r1.state, config);
    expect(r2.terms.i).toBeCloseTo(4); // 2 + 1*2*1
  });

  test('integral accumulates with varying errors', () => {
    let state = initialPIDState();
    const r1 = pidStep(3, state, config);
    expect(r1.terms.i).toBeCloseTo(3);
    const r2 = pidStep(1, r1.state, config);
    expect(r2.terms.i).toBeCloseTo(4);
  });

  test('integral accounts for sample time', () => {
    const cfg = defaultPIDConfig({
      gains: { kp: 0, ki: 2, kd: 0 },
      sampleTime: 0.5,
    });
    const r = pidStep(4, initialPIDState(), cfg);
    // ki * error * dt = 2 * 4 * 0.5 = 4
    expect(r.terms.i).toBeCloseTo(4);
  });
});

// ---------------------------------------------------------------------------
// 3. Anti-windup clamping
// ---------------------------------------------------------------------------
describe('anti-windup clamping', () => {
  const config = defaultPIDConfig({
    gains: { kp: 0, ki: 1, kd: 0 },
    sampleTime: 1,
    integralLimits: [-5, 5],
  });

  test('integral clamps at upper limit', () => {
    let state = initialPIDState();
    // Push integral to 10, should clamp at 5
    const r1 = pidStep(10, state, config);
    expect(r1.terms.i).toBeCloseTo(5);
    expect(r1.state.integral).toBeCloseTo(5);
  });

  test('integral clamps at lower limit', () => {
    let state = initialPIDState();
    const r1 = pidStep(-10, state, config);
    expect(r1.terms.i).toBeCloseTo(-5);
    expect(r1.state.integral).toBeCloseTo(-5);
  });

  test('output still changes via P term when integral saturated', () => {
    const cfg = defaultPIDConfig({
      gains: { kp: 1, ki: 1, kd: 0 },
      sampleTime: 1,
      integralLimits: [-5, 5],
    });
    let state = initialPIDState();
    // Saturate integral
    const r1 = pidStep(10, state, cfg);
    expect(r1.state.integral).toBeCloseTo(5);
    // Now with error = 1, P = 1, I still clamped at 5+1=5 => output = 1+5 = 6
    const r2 = pidStep(1, r1.state, cfg);
    expect(r2.terms.p).toBeCloseTo(1);
    expect(r2.terms.i).toBeCloseTo(5); // still clamped
    expect(r2.output).toBeCloseTo(6);
  });
});

// ---------------------------------------------------------------------------
// 4. Derivative term
// ---------------------------------------------------------------------------
describe('derivative term', () => {
  // alpha=1 means no filtering: d_filtered = d_raw
  const config = defaultPIDConfig({
    gains: { kp: 0, ki: 0, kd: 1 },
    sampleTime: 0.1,
    derivativeFilterCoeff: 1,
  });

  test('step change in error produces derivative output', () => {
    const state = initialPIDState();
    // error goes from 0 to 5, derivative = (5-0)/0.1 = 50
    const r = pidStep(5, state, config);
    expect(r.terms.d).toBeCloseTo(50);
  });

  test('constant error produces zero derivative after first step', () => {
    const state = initialPIDState();
    const r1 = pidStep(3, state, config);
    // derivative = (3-0)/0.1 = 30
    expect(r1.terms.d).toBeCloseTo(30);
    const r2 = pidStep(3, r1.state, config);
    // derivative = (3-3)/0.1 = 0
    expect(r2.terms.d).toBeCloseTo(0);
  });

  test('negative error change produces negative derivative', () => {
    // Start from a state where previous error was 5
    const state: PIDState = { integral: 0, previousError: 5, previousDerivative: 0 };
    // Error drops to 2, derivative = (2-5)/0.1 = -30
    const r = pidStep(2, state, config);
    expect(r.terms.d).toBeCloseTo(-30);
  });
});

// ---------------------------------------------------------------------------
// 5. Derivative filtering
// ---------------------------------------------------------------------------
describe('derivative filtering', () => {
  test('alpha < 1 smooths derivative response', () => {
    const cfg = defaultPIDConfig({
      gains: { kp: 0, ki: 0, kd: 1 },
      sampleTime: 0.1,
      derivativeFilterCoeff: 0.5,
    });
    const state = initialPIDState();
    // raw derivative = (5-0)/0.1 = 50
    // filtered = 0.5*50 + 0.5*0 = 25
    const r = pidStep(5, state, cfg);
    expect(r.terms.d).toBeCloseTo(25);
  });

  test('filtering carries over between steps', () => {
    const cfg = defaultPIDConfig({
      gains: { kp: 0, ki: 0, kd: 1 },
      sampleTime: 0.1,
      derivativeFilterCoeff: 0.5,
    });
    const state = initialPIDState();
    const r1 = pidStep(5, state, cfg);
    // raw = 50, filtered = 0.5*50 + 0.5*0 = 25
    expect(r1.state.previousDerivative).toBeCloseTo(25);

    const r2 = pidStep(5, r1.state, cfg);
    // raw = (5-5)/0.1 = 0, filtered = 0.5*0 + 0.5*25 = 12.5
    expect(r2.terms.d).toBeCloseTo(12.5);
  });

  test('alpha=1 matches unfiltered derivative', () => {
    const cfgFiltered = defaultPIDConfig({
      gains: { kp: 0, ki: 0, kd: 1 },
      sampleTime: 0.1,
      derivativeFilterCoeff: 1,
    });
    const cfgUnfiltered = defaultPIDConfig({
      gains: { kp: 0, ki: 0, kd: 1 },
      sampleTime: 0.1,
      derivativeFilterCoeff: 1,
    });
    const state = initialPIDState();
    const r1 = pidStep(3, state, cfgFiltered);
    const r2 = pidStep(3, state, cfgUnfiltered);
    expect(r1.terms.d).toBeCloseTo(r2.terms.d);
  });
});

// ---------------------------------------------------------------------------
// 6. Output clamping
// ---------------------------------------------------------------------------
describe('output clamping', () => {
  test('output clamps at upper limit', () => {
    const cfg = defaultPIDConfig({
      gains: { kp: 100, ki: 0, kd: 0 },
      outputLimits: [-10, 10],
    });
    const r = pidStep(5, initialPIDState(), cfg);
    // P = 100*5 = 500, clamped to 10
    expect(r.output).toBeCloseTo(10);
  });

  test('output clamps at lower limit', () => {
    const cfg = defaultPIDConfig({
      gains: { kp: 100, ki: 0, kd: 0 },
      outputLimits: [-10, 10],
    });
    const r = pidStep(-5, initialPIDState(), cfg);
    // P = 100*(-5) = -500, clamped to -10
    expect(r.output).toBeCloseTo(-10);
  });
});

// ---------------------------------------------------------------------------
// 7. Full PID
// ---------------------------------------------------------------------------
describe('full PID controller', () => {
  const config = defaultPIDConfig({
    gains: { kp: 2, ki: 0.5, kd: 0.1 },
    sampleTime: 0.1,
    derivativeFilterCoeff: 1,
  });

  test('first step with large error has all three terms', () => {
    const r = pidStep(10, initialPIDState(), config);
    expect(r.terms.p).toBeCloseTo(20); // 2 * 10
    expect(r.terms.i).toBeCloseTo(0.5); // 0.5 * 10 * 0.1
    // d_raw = (10-0)/0.1 = 100, d = 0.1 * 100 = 10
    expect(r.terms.d).toBeCloseTo(10);
    expect(r.output).toBeCloseTo(30.5);
  });

  test('second step with same error: integral grows, derivative zero', () => {
    const r1 = pidStep(10, initialPIDState(), config);
    const r2 = pidStep(10, r1.state, config);
    expect(r2.terms.p).toBeCloseTo(20);
    expect(r2.terms.i).toBeCloseTo(1.0); // 0.5 + 0.5*10*0.1
    expect(r2.terms.d).toBeCloseTo(0); // no change in error
    expect(r2.output).toBeCloseTo(21.0);
  });

  test('decreasing error: derivative becomes negative', () => {
    const r1 = pidStep(10, initialPIDState(), config);
    const r2 = pidStep(5, r1.state, config);
    expect(r2.terms.p).toBeCloseTo(10); // 2*5
    // integral = 0.5 + 0.5*5*0.1 = 0.75
    expect(r2.terms.i).toBeCloseTo(0.75);
    // d_raw = (5-10)/0.1 = -50, d = 0.1 * (-50) = -5
    expect(r2.terms.d).toBeCloseTo(-5);
    expect(r2.output).toBeCloseTo(5.75);
  });
});

// ---------------------------------------------------------------------------
// 8. Zero error
// ---------------------------------------------------------------------------
describe('zero error', () => {
  test('zero error with zero initial state produces zero output', () => {
    const config = defaultPIDConfig({
      gains: { kp: 2, ki: 1, kd: 0.5 },
      sampleTime: 0.1,
    });
    const r = pidStep(0, initialPIDState(), config);
    expect(r.output).toBeCloseTo(0);
    expect(r.terms.p).toBeCloseTo(0);
    expect(r.terms.i).toBeCloseTo(0);
    expect(r.terms.d).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Setpoint change (error sign change)
// ---------------------------------------------------------------------------
describe('setpoint change', () => {
  const config = defaultPIDConfig({
    gains: { kp: 1, ki: 1, kd: 0 },
    sampleTime: 1,
  });

  test('error sign change causes integral to unwind', () => {
    let state = initialPIDState();
    // Positive errors accumulate integral
    const r1 = pidStep(5, state, config);
    expect(r1.state.integral).toBeCloseTo(5);
    const r2 = pidStep(5, r1.state, config);
    expect(r2.state.integral).toBeCloseTo(10);
    // Negative error starts unwinding
    const r3 = pidStep(-3, r2.state, config);
    expect(r3.state.integral).toBeCloseTo(7); // 10 + (-3)*1
  });

  test('integral can cross zero with sustained opposite error', () => {
    let state = initialPIDState();
    const r1 = pidStep(2, state, config);
    expect(r1.state.integral).toBeCloseTo(2);
    const r2 = pidStep(-5, r1.state, config);
    expect(r2.state.integral).toBeCloseTo(-3); // 2 + (-5)*1
  });
});

// ---------------------------------------------------------------------------
// 10. Sequence function
// ---------------------------------------------------------------------------
describe('pidSequence', () => {
  test('produces correct output array length', () => {
    const config = defaultPIDConfig({
      gains: { kp: 1, ki: 0, kd: 0 },
    });
    const errors = [1, 2, 3, 4, 5];
    const { outputs } = pidSequence(errors, config);
    expect(outputs).toHaveLength(5);
  });

  test('outputs match sequential pidStep calls', () => {
    const config = defaultPIDConfig({
      gains: { kp: 2, ki: 0.5, kd: 0.1 },
      sampleTime: 0.1,
      derivativeFilterCoeff: 1,
    });
    const errors = [10, 8, 5, 2, 0];

    // Via pidSequence
    const { outputs, finalState } = pidSequence(errors, config);

    // Via manual pidStep
    let state = initialPIDState();
    const manual: number[] = [];
    for (const e of errors) {
      const r = pidStep(e, state, config);
      manual.push(r.output);
      state = r.state;
    }

    for (let i = 0; i < errors.length; i++) {
      expect(outputs[i]).toBeCloseTo(manual[i]);
    }
    expect(finalState.integral).toBeCloseTo(state.integral);
    expect(finalState.previousError).toBeCloseTo(state.previousError);
    expect(finalState.previousDerivative).toBeCloseTo(state.previousDerivative);
  });
});
