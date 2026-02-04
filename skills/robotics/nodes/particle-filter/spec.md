# particle-filter — Spec

Depends on: `result-types`

> Also uses `createRNG` from `rrt` for seeded randomness.

## Purpose

Bootstrap (SIR) particle filter with systematic resampling. Represents the
posterior distribution as a weighted set of samples (particles). Handles
arbitrary nonlinear dynamics and non-Gaussian noise, unlike the KF/EKF/UKF
family.

Algorithm per step:
1. **Predict** — propagate each particle through the dynamics model + noise
2. **Update** — reweight particles based on measurement likelihood
3. **Resample** — systematic resampling when effective sample size drops

## Types

### Particle

| Field | Type | Description |
|-------|------|-------------|
| `state` | number[] | State vector (arbitrary dimension) |
| `weight` | number | Unnormalized weight |

### ParticleFilterConfig

| Field | Type | Description |
|-------|------|-------------|
| `numParticles` | number | Number of particles |
| `resampleThreshold` | number | Effective sample size threshold for resampling (fraction of numParticles, 0-1) |

### DEFAULT_PARTICLE_FILTER_CONFIG

```
{ numParticles: 200, resampleThreshold: 0.5 }
```

### ParticleFilterResult

| Field | Type | Description |
|-------|------|-------------|
| `particles` | Particle[] | Updated particles with normalized weights |
| `estimate` | number[] | Weighted mean estimate |
| `nEff` | number | Effective sample size |
| `resampled` | boolean | Whether resampling was triggered |

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `particleFilterInit` | `(bounds, numParticles, seed?) -> Particle[]` | Create initial particles uniformly distributed within bounds |
| `particleFilterPredict` | `(particles, dynamics, rng) -> Particle[]` | Predict step: propagate each particle through dynamics (weights unchanged) |
| `particleFilterUpdate` | `(particles, measurement, likelihood) -> Particle[]` | Update step: reweight by measurement likelihood, normalize |
| `particleFilterNEff` | `(particles) -> number` | Effective sample size: N_eff = 1 / sum(w_i^2) |
| `particleFilterEstimate` | `(particles) -> number[]` | Weighted mean of particle states |
| `particleFilterResample` | `(particles, rng) -> Particle[]` | Systematic (low-variance) resampling to uniform weights |
| `particleFilterStep` | `(particles, measurement, dynamics, likelihood, rng, config?) -> ParticleFilterResult` | Full predict-update-resample cycle |

### particleFilterInit

Creates `numParticles` particles uniformly sampled within `bounds` (one
`[min, max]` pair per dimension). Weights are initialized to `1/N`. Accepts
an optional `seed` (default 0) for deterministic initialization via
`createRNG`.

### particleFilterPredict

Maps each particle through `dynamics(state, rng) -> newState`. Weights are
preserved unchanged. The `rng` is passed through so dynamics can add process
noise.

### particleFilterUpdate

Computes new weights as prior log-weight plus log-likelihood, using
log-sum-exp for numerical stability. Returns new particles with normalized
weights summing to 1. Does not mutate the input array.

```
logW_i = log(w_i) + likelihood(state_i, measurement)
w_i    = exp(logW_i - max(logW)) / sum(exp(logW - max(logW)))
```

### particleFilterNEff

@provenance FilterPy v1.4.5 (N_eff = 1/sum(w_i^2))

```
N_eff = 1 / sum(w_i^2)
```

### particleFilterEstimate

Weighted mean across all particles:

```
estimate[d] = sum(w_i * state_i[d])
```

### particleFilterResample

@provenance Systematic resampling (Kitagawa 1996), low variance, O(N)

Draws N new particles with equal weights `1/N` from the weighted particle set.
Uses a single random offset and evenly spaced cumulative weight thresholds.

```
step    = 1 / N
offset  = rng() * step
for i in 0..N-1:
  threshold = offset + i * step
  advance j until cumWeights[j] >= threshold
  copy particle j with weight = step
```

### particleFilterStep

Composes predict, update, and conditional resample. Resampling is triggered
when `nEff < config.resampleThreshold * config.numParticles`. Returns a
`ParticleFilterResult` with the final particles, weighted mean estimate,
effective sample size, and a boolean indicating whether resampling occurred.

## Test Vectors

### Initialization

@provenance Bootstrap particle filter — uniform initialization

| Test | Input | Expected |
|------|-------|----------|
| Correct particle count | bounds=[[0,10]], N=100, seed=42 | 100 particles |
| Uniform weights | bounds=[[0,10]], N=50, seed=42 | all weights = 1/50 |
| Particles within bounds | bounds=[[0,5],[-3,3]], N=200, seed=42 | dim 0 in [0,5], dim 1 in [-3,3] |
| Deterministic with same seed | bounds=[[0,10]], N=20, seed=42 twice | identical particles |
| Different seeds produce different particles | seed=42 vs seed=99 | at least one particle differs |

### Predict

@provenance Bootstrap particle filter — predict step preserves weights

| Test | Input | Expected |
|------|-------|----------|
| Propagates through dynamics | state=[0], dynamics: s+1 | state=[1] |
| Preserves weights | weights [0.3, 0.7], identity dynamics | weights [0.3, 0.7] |
| Passes rng to dynamics for noise | dynamics: state + rng(), single particle at 0 | state != 0 |

### Update

@provenance Bootstrap particle filter — importance weighting

| Test | Input | Expected |
|------|-------|----------|
| Reweights by likelihood | particles at [0] and [10], measurement at [0], Gaussian likelihood | particle at [0] gets higher weight |
| Weights sum to 1 | 4 particles, any Gaussian likelihood | sum of weights = 1 (tol 1e-10) |
| Does not modify original particles | particles with weight 0.5 | original weights unchanged after update |

### Effective sample size (N_eff)

@provenance FilterPy v1.4.5 (N_eff = 1/sum(w_i^2))

| Test | Input | Expected |
|------|-------|----------|
| Uniform weights: N_eff = N | 100 particles, weight = 0.01 each | N_eff ~ 100 |
| Single dominant particle: N_eff ~ 1 | weights [1, 0, 0] | N_eff ~ 1 |
| Non-uniform: 1 < N_eff < N | weights [0.7, 0.2, 0.1] | 1 < N_eff < 3 |

### Estimate

@provenance Weighted mean — standard particle filter estimate

| Test | Input | Expected |
|------|-------|----------|
| Weighted mean (1D) | particles at [0] and [10], weights 0.5 each | estimate = [5] |
| Multi-dimensional | particles [1,2] w=0.3, [4,8] w=0.7 | estimate = [0.3*1+0.7*4, 0.3*2+0.7*8] = [3.1, 6.2] |

### Systematic resampling

@provenance Systematic resampling (Kitagawa 1996), low variance, O(N)

| Test | Input | Expected |
|------|-------|----------|
| Same particle count after resampling | 3 particles with varying weights | 3 resampled particles |
| Uniform weights after resampling | 10 particles, one dominant (w=0.91) | all weights = 0.1 (tol 1e-8) |
| High-weight particles duplicated | particle at [5] with w=0.98 among 3 | state [5] appears >= 2 times |
| Deterministic with same rng | same particles, createRNG(42) twice | identical resampled sets |

### Full step

@provenance FilterPy v1.4.5 (API shape), LowLevelParticleFilters.jl v3.29.4

| Test | Input | Expected |
|------|-------|----------|
| Runs complete cycle | 50 particles in [0,10], measurement=[5], identity dynamics + small noise | 50 particles, 1D estimate, nEff > 0 |
| Converges to true value | 500 particles in [0,20], trueValue=7, 30 steps, Gaussian likelihood | estimate ~ 7 (tol 1 digit) |
| No resampling when N_eff is high | 10 particles, uniform weights, uniform likelihood | resampled = false, nEff ~ 10 |
| Triggers resampling when N_eff < threshold | 4 particles, one dominant (w=0.97), measurement favors dominant | resampled = true |

### 2D tracking

@provenance Bootstrap particle filter — multi-dimensional convergence

| Test | Input | Expected |
|------|-------|----------|
| Tracks 2D position | 500 particles in [-5,15]^2, truePos=[3,7], 30 steps, Gaussian likelihood | estimate[0] ~ 3, estimate[1] ~ 7 (tol 1 digit) |
