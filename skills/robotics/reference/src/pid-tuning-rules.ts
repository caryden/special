/**
 * Classical PID tuning rules from FOPDT model parameters or ultimate gain parameters.
 *
 * @node pid-tuning-rules
 * @depends-on result-types
 * @contract pid-tuning-rules.test.ts
 * @hint off-policy: Gain form is key design decision. We use parallel form (kp, ki, kd)
 *       as primary and provide standard-form (kp, ti, td) conversion via gainsToStandard.
 * @hint tuning: All methods compute gains in standard (ISA) form first, then convert
 *       to parallel form for output.
 * @provenance O'Dwyer "Handbook of PI and PID Controller Tuning Rules" 3rd ed. 2009
 * @provenance Astrom & Hagglund "Advanced PID Control" 2006
 */

import {
  type PIDGains,
  type PIDGainsStandard,
  type FOPDTModel,
  type TuningMethod,
  type ControllerType,
  type UltimateGainParams,
  gainsToParallel,
} from './result-types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert standard form to parallel PIDGains, with P-only and PI handling. */
function standardToParallel(kp: number, ti: number, td: number): PIDGains {
  return gainsToParallel({ kp, ti, td } as PIDGainsStandard);
}

/** Return P-only gains (ki=0, kd=0). */
function pOnly(kp: number): PIDGains {
  return { kp, ki: 0, kd: 0 };
}

// ---------------------------------------------------------------------------
// Ziegler-Nichols open-loop (reaction curve)
// ---------------------------------------------------------------------------

/**
 * Ziegler-Nichols open-loop (reaction curve) method from FOPDT model.
 * @provenance Ziegler & Nichols 1942, "Optimum Settings for Automatic Controllers"
 */
export function tuneZieglerNichols(
  model: FOPDTModel,
  controllerType: ControllerType,
): PIDGains {
  const { K, tau, theta } = model;

  switch (controllerType) {
    case 'P':
      return pOnly(tau / (K * theta));
    case 'PI': {
      const kp = 0.9 * tau / (K * theta);
      const ti = theta / 0.3;
      return standardToParallel(kp, ti, 0);
    }
    case 'PID': {
      const kp = 1.2 * tau / (K * theta);
      const ti = 2 * theta;
      const td = 0.5 * theta;
      return standardToParallel(kp, ti, td);
    }
  }
}

// ---------------------------------------------------------------------------
// Ziegler-Nichols ultimate gain
// ---------------------------------------------------------------------------

/**
 * Ziegler-Nichols ultimate gain method (from relay test Ku/Tu).
 * @provenance Ziegler & Nichols 1942
 */
export function tuneZieglerNicholsUltimate(
  params: UltimateGainParams,
  controllerType: ControllerType,
): PIDGains {
  const { Ku, Tu } = params;

  switch (controllerType) {
    case 'P':
      return pOnly(0.5 * Ku);
    case 'PI': {
      const kp = 0.45 * Ku;
      const ti = Tu / 1.2;
      return standardToParallel(kp, ti, 0);
    }
    case 'PID': {
      const kp = 0.6 * Ku;
      const ti = Tu / 2;
      const td = Tu / 8;
      return standardToParallel(kp, ti, td);
    }
  }
}

// ---------------------------------------------------------------------------
// Cohen-Coon
// ---------------------------------------------------------------------------

/**
 * Cohen-Coon method from FOPDT model.
 * @provenance Cohen & Coon 1953
 */
export function tuneCohenCoon(
  model: FOPDTModel,
  controllerType: ControllerType,
): PIDGains {
  const { K, tau, theta } = model;
  const r = theta / tau;

  switch (controllerType) {
    case 'P': {
      const kp = (1 / (K * r)) * (1 + r / 3);
      return pOnly(kp);
    }
    case 'PI': {
      const kp = (1 / (K * r)) * (0.9 + r / 12);
      const ti = theta * (30 + 3 * r) / (9 + 20 * r);
      return standardToParallel(kp, ti, 0);
    }
    case 'PID': {
      const kp = (1 / (K * r)) * (4 / 3 + r / 4);
      const ti = theta * (32 + 6 * r) / (13 + 8 * r);
      const td = theta * 4 / (11 + 2 * r);
      return standardToParallel(kp, ti, td);
    }
  }
}

// ---------------------------------------------------------------------------
// Tyreus-Luyben
// ---------------------------------------------------------------------------

/**
 * Tyreus-Luyben method from ultimate gain parameters. More conservative than ZN.
 * @provenance Tyreus & Luyben 1992
 */
export function tuneTyreusLuyben(
  params: UltimateGainParams,
  controllerType: ControllerType,
): PIDGains {
  const { Ku, Tu } = params;

  if (controllerType === 'P') {
    throw new Error('Tyreus-Luyben method does not define P-only tuning rules');
  }

  switch (controllerType) {
    case 'PI': {
      const kp = Ku / 3.2;
      const ti = 2.2 * Tu;
      return standardToParallel(kp, ti, 0);
    }
    case 'PID': {
      const kp = Ku / 2.2;
      const ti = 2.2 * Tu;
      const td = Tu / 6.3;
      return standardToParallel(kp, ti, td);
    }
  }
}

// ---------------------------------------------------------------------------
// SIMC (Skogestad Internal Model Control)
// ---------------------------------------------------------------------------

/**
 * SIMC (Skogestad Internal Model Control) method.
 * @provenance Skogestad "Simple analytic rules for model reduction and PID controller tuning" 2003
 */
export function tuneSIMC(
  model: FOPDTModel,
  controllerType: ControllerType,
  tau_c?: number,
): PIDGains {
  const { K, tau, theta } = model;

  if (controllerType === 'P') {
    throw new Error('SIMC method does not define P-only tuning rules');
  }

  const tc = tau_c ?? Math.max(tau, 8 * theta);

  switch (controllerType) {
    case 'PI': {
      const kp = tau / (K * (tc + theta));
      const ti = Math.min(tau, 4 * (tc + theta));
      return standardToParallel(kp, ti, 0);
    }
    case 'PID': {
      const kp = tau / (K * (tc + theta));
      const ti = Math.min(tau, 4 * (tc + theta));
      const td = theta / 2;
      return standardToParallel(kp, ti, td);
    }
  }
}

// ---------------------------------------------------------------------------
// Lambda tuning
// ---------------------------------------------------------------------------

/**
 * Lambda tuning method.
 * @provenance Dahlin 1968, refined by many
 */
export function tuneLambda(
  model: FOPDTModel,
  controllerType: ControllerType,
  lambda?: number,
): PIDGains {
  const { K, tau, theta } = model;

  if (controllerType === 'P') {
    throw new Error('Lambda tuning method does not define P-only tuning rules');
  }

  const lam = lambda ?? 3 * theta;

  switch (controllerType) {
    case 'PI': {
      const kp = tau / (K * (lam + theta));
      const ti = tau;
      return standardToParallel(kp, ti, 0);
    }
    case 'PID': {
      const kp = tau / (K * (lam + theta));
      const ti = tau;
      const td = theta / 2;
      return standardToParallel(kp, ti, td);
    }
  }
}

// ---------------------------------------------------------------------------
// IMC (Internal Model Control)
// ---------------------------------------------------------------------------

/**
 * Internal Model Control tuning.
 * @provenance Rivera, Morari & Skogestad 1986
 */
export function tuneIMC(
  model: FOPDTModel,
  controllerType: ControllerType,
  lambda?: number,
): PIDGains {
  const { K, tau, theta } = model;

  if (controllerType === 'P') {
    throw new Error('IMC tuning method does not define P-only tuning rules');
  }

  const lam = lambda ?? Math.max(0.25 * tau, 0.2 * theta);

  switch (controllerType) {
    case 'PI': {
      const kp = (tau + theta / 2) / (K * (lam + theta / 2));
      const ti = tau + theta / 2;
      return standardToParallel(kp, ti, 0);
    }
    case 'PID': {
      const kp = (2 * tau + theta) / (K * 2 * (lam + theta));
      const ti = tau + theta / 2;
      const td = (tau * theta) / (2 * tau + theta);
      return standardToParallel(kp, ti, td);
    }
  }
}

// ---------------------------------------------------------------------------
// Tuning options
// ---------------------------------------------------------------------------

/** Options for tune dispatcher */
export interface TuneOptions {
  /** Closed-loop time constant for SIMC method */
  tau_c?: number;
  /** Lambda parameter for lambda/IMC methods */
  lambda?: number;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatcher that selects the right tuning method.
 *
 * When method is 'ziegler-nichols', the input type determines the variant:
 * - FOPDTModel -> open-loop (reaction curve)
 * - UltimateGainParams -> ultimate gain method
 *
 * When method is 'tyreus-luyben', input must be UltimateGainParams.
 * All other methods require FOPDTModel input.
 */
export function tune(
  modelOrParams: FOPDTModel | UltimateGainParams,
  method: TuningMethod,
  controllerType: ControllerType,
  options?: TuneOptions,
): PIDGains {
  const isUltimate = 'Ku' in modelOrParams && 'Tu' in modelOrParams;

  switch (method) {
    case 'ziegler-nichols': {
      if (isUltimate) {
        return tuneZieglerNicholsUltimate(
          modelOrParams as UltimateGainParams,
          controllerType,
        );
      }
      return tuneZieglerNichols(modelOrParams as FOPDTModel, controllerType);
    }
    case 'cohen-coon':
      return tuneCohenCoon(modelOrParams as FOPDTModel, controllerType);
    case 'tyreus-luyben':
      return tuneTyreusLuyben(modelOrParams as UltimateGainParams, controllerType);
    case 'simc':
      return tuneSIMC(modelOrParams as FOPDTModel, controllerType, options?.tau_c);
    case 'lambda':
      return tuneLambda(modelOrParams as FOPDTModel, controllerType, options?.lambda);
    case 'imc':
      return tuneIMC(modelOrParams as FOPDTModel, controllerType, options?.lambda);
  }
}
