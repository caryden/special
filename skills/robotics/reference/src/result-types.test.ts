import { describe, expect, test } from 'bun:test';
import {
  defaultPIDConfig,
  initialPIDState,
  gainsToStandard,
  gainsToParallel,
  point2d,
  type PIDConfig,
  type PIDGains,
  type PIDGainsStandard,
  type PIDState,
  type ControlOutput,
  type Point2D,
  type PlanResult,
  type IKResult,
  type FOPDTModel,
  type UltimateGainParams,
  type TuningMethod,
  type ControllerType,
} from './result-types';

describe('result-types', () => {
  // -----------------------------------------------------------------------
  // defaultPIDConfig
  // -----------------------------------------------------------------------

  describe('defaultPIDConfig', () => {
    test('returns sensible defaults with no overrides', () => {
      const cfg = defaultPIDConfig();
      expect(cfg.gains).toEqual({ kp: 1, ki: 0, kd: 0 });
      expect(cfg.outputLimits).toEqual([-Infinity, Infinity]);
      expect(cfg.integralLimits).toEqual([-Infinity, Infinity]);
      expect(cfg.derivativeFilterCoeff).toBe(1);
      expect(cfg.sampleTime).toBe(0.01);
    });

    test('applies partial overrides without mutating defaults', () => {
      const cfg = defaultPIDConfig({
        gains: { kp: 2, ki: 0.5, kd: 1 },
        sampleTime: 0.02,
      });
      expect(cfg.gains).toEqual({ kp: 2, ki: 0.5, kd: 1 });
      expect(cfg.sampleTime).toBe(0.02);
      // non-overridden fields keep defaults
      expect(cfg.outputLimits).toEqual([-Infinity, Infinity]);
      expect(cfg.derivativeFilterCoeff).toBe(1);
    });

    test('partial gains override merges with defaults', () => {
      const cfg = defaultPIDConfig({ gains: { kp: 5, ki: 0, kd: 0 } });
      expect(cfg.gains.kp).toBe(5);
      expect(cfg.gains.ki).toBe(0);
      expect(cfg.gains.kd).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // initialPIDState
  // -----------------------------------------------------------------------

  describe('initialPIDState', () => {
    test('returns all-zero state', () => {
      const state = initialPIDState();
      expect(state.integral).toBe(0);
      expect(state.previousError).toBe(0);
      expect(state.previousDerivative).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // gainsToStandard / gainsToParallel
  // -----------------------------------------------------------------------

  describe('gains conversion', () => {
    test('parallel → standard with known values', () => {
      const parallel: PIDGains = { kp: 2, ki: 0.5, kd: 1 };
      const standard = gainsToStandard(parallel);
      expect(standard.kp).toBe(2);
      expect(standard.ti).toBe(4);   // kp / ki = 2 / 0.5
      expect(standard.td).toBe(0.5); // kd / kp = 1 / 2
    });

    test('standard → parallel with known values', () => {
      const standard: PIDGainsStandard = { kp: 2, ti: 4, td: 0.5 };
      const parallel = gainsToParallel(standard);
      expect(parallel.kp).toBe(2);
      expect(parallel.ki).toBe(0.5);  // kp / ti = 2 / 4
      expect(parallel.kd).toBe(1);    // kp * td = 2 * 0.5
    });

    test('roundtrip parallel → standard → parallel', () => {
      const original: PIDGains = { kp: 3, ki: 1.5, kd: 0.6 };
      const roundtrip = gainsToParallel(gainsToStandard(original));
      expect(roundtrip.kp).toBeCloseTo(original.kp, 10);
      expect(roundtrip.ki).toBeCloseTo(original.ki, 10);
      expect(roundtrip.kd).toBeCloseTo(original.kd, 10);
    });

    test('roundtrip standard → parallel → standard', () => {
      const original: PIDGainsStandard = { kp: 4, ti: 2, td: 0.25 };
      const roundtrip = gainsToStandard(gainsToParallel(original));
      expect(roundtrip.kp).toBeCloseTo(original.kp, 10);
      expect(roundtrip.ti).toBeCloseTo(original.ti, 10);
      expect(roundtrip.td).toBeCloseTo(original.td, 10);
    });

    test('P-only: ki=0 yields ti=Infinity', () => {
      const pOnly: PIDGains = { kp: 5, ki: 0, kd: 0 };
      const standard = gainsToStandard(pOnly);
      expect(standard.ti).toBe(Infinity);
      expect(standard.td).toBe(0);
    });

    test('P-only roundtrip through standard form', () => {
      const pOnly: PIDGains = { kp: 5, ki: 0, kd: 0 };
      const roundtrip = gainsToParallel(gainsToStandard(pOnly));
      expect(roundtrip.ki).toBe(0);
      expect(roundtrip.kd).toBe(0);
    });

    test('kp=0 edge case: td=0 in standard form', () => {
      const gains: PIDGains = { kp: 0, ki: 1, kd: 2 };
      const standard = gainsToStandard(gains);
      expect(standard.kp).toBe(0);
      expect(standard.td).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // point2d
  // -----------------------------------------------------------------------

  describe('point2d', () => {
    test('creates a Point2D with given coordinates', () => {
      const p = point2d(3.5, -1.2);
      expect(p.x).toBe(3.5);
      expect(p.y).toBe(-1.2);
    });
  });

  // -----------------------------------------------------------------------
  // Type structure verification
  // -----------------------------------------------------------------------

  describe('type structure verification', () => {
    test('ControlOutput has linear and angular', () => {
      const out: ControlOutput = { linear: 1, angular: 0.5 };
      expect(out).toHaveProperty('linear');
      expect(out).toHaveProperty('angular');
    });

    test('PlanResult has all required fields', () => {
      const result: PlanResult = {
        path: [point2d(0, 0), point2d(1, 1)],
        cost: 1.414,
        success: true,
        nodesExplored: 10,
      };
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('cost');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('nodesExplored');
      expect(result.path).toHaveLength(2);
    });

    test('IKResult has all required fields', () => {
      const result: IKResult = {
        jointAngles: [0.1, 0.2, 0.3],
        converged: true,
        positionError: 0.001,
        iterations: 15,
      };
      expect(result).toHaveProperty('jointAngles');
      expect(result).toHaveProperty('converged');
      expect(result).toHaveProperty('positionError');
      expect(result).toHaveProperty('iterations');
    });

    test('FOPDTModel and UltimateGainParams have required fields', () => {
      const model: FOPDTModel = { K: 1.5, tau: 10, theta: 2 };
      expect(model).toHaveProperty('K');
      expect(model).toHaveProperty('tau');
      expect(model).toHaveProperty('theta');

      const ug: UltimateGainParams = { Ku: 4.5, Tu: 1.2 };
      expect(ug).toHaveProperty('Ku');
      expect(ug).toHaveProperty('Tu');
    });

    test('TuningMethod and ControllerType accept valid values', () => {
      const methods: TuningMethod[] = [
        'ziegler-nichols', 'cohen-coon', 'tyreus-luyben', 'simc', 'lambda', 'imc',
      ];
      expect(methods).toHaveLength(6);

      const types: ControllerType[] = ['P', 'PI', 'PID'];
      expect(types).toHaveLength(3);
    });
  });
});
