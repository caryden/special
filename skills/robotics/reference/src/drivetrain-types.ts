/**
 * Drivetrain configuration types for wheeled mobile robots.
 *
 * @node drivetrain-types
 * @contract drivetrain-types.test.ts
 * @hint types: Use plain interfaces/objects, not classes.
 */

// ---------------------------------------------------------------------------
// Velocity types
// ---------------------------------------------------------------------------

/** 2D velocity (body frame) */
export interface Twist2D {
  /** Forward velocity (m/s) */
  vx: number;
  /** Lateral velocity (m/s) — zero for differential drive */
  vy: number;
  /** Angular velocity (rad/s) — positive is counter-clockwise */
  omega: number;
}

// ---------------------------------------------------------------------------
// Differential drive
// ---------------------------------------------------------------------------

/** Differential drive geometry */
export interface DifferentialDriveGeometry {
  /** Distance between wheel centers (meters) */
  trackWidth: number;
  /** Wheel radius (meters) */
  wheelRadius: number;
}

/** Differential drive wheel speeds */
export interface DifferentialWheelSpeeds {
  /** Left wheel angular velocity (rad/s) */
  left: number;
  /** Right wheel angular velocity (rad/s) */
  right: number;
}

// ---------------------------------------------------------------------------
// Mecanum drive
// ---------------------------------------------------------------------------

/** Mecanum drive geometry (4-wheel omnidirectional) */
export interface MecanumDriveGeometry {
  /** Distance between front and rear axles (meters) */
  wheelBase: number;
  /** Distance between left and right wheels (meters) */
  trackWidth: number;
  /** Wheel radius (meters) */
  wheelRadius: number;
}

/** Mecanum drive wheel speeds (front-left, front-right, rear-left, rear-right) */
export interface MecanumWheelSpeeds {
  frontLeft: number;
  frontRight: number;
  rearLeft: number;
  rearRight: number;
}

// ---------------------------------------------------------------------------
// Swerve drive
// ---------------------------------------------------------------------------

/** Swerve module state (one per wheel) */
export interface SwerveModuleState {
  /** Wheel speed (m/s) */
  speed: number;
  /** Module angle (radians, 0 = forward) */
  angle: number;
}

/** Swerve drive geometry */
export interface SwerveDriveGeometry {
  /** Distance between front and rear axles (meters) */
  wheelBase: number;
  /** Distance between left and right wheels (meters) */
  trackWidth: number;
}

// ---------------------------------------------------------------------------
// Ackermann steering
// ---------------------------------------------------------------------------

/** Ackermann steering geometry */
export interface AckermannGeometry {
  /** Distance between front and rear axles (meters) */
  wheelBase: number;
  /** Distance between left and right steering pivots (meters) */
  trackWidth: number;
  /** Maximum steering angle (radians) */
  maxSteeringAngle: number;
}

/** Ackermann steering command */
export interface AckermannCommand {
  /** Vehicle speed (m/s) */
  speed: number;
  /** Steering angle (radians, positive = left) */
  steeringAngle: number;
}

// ---------------------------------------------------------------------------
// Odometry
// ---------------------------------------------------------------------------

/** Robot pose in 2D (for odometry) */
export interface Pose2D {
  /** X position (meters) */
  x: number;
  /** Y position (meters) */
  y: number;
  /** Heading angle (radians) */
  theta: number;
}

// ---------------------------------------------------------------------------
// Factory / helper functions
// ---------------------------------------------------------------------------

/** Create a Twist2D */
export function twist2d(vx: number, vy: number, omega: number): Twist2D {
  return { vx, vy, omega };
}

/** Create a zero Twist2D */
export function zeroTwist(): Twist2D {
  return { vx: 0, vy: 0, omega: 0 };
}

/** Create a DifferentialDriveGeometry */
export function differentialGeometry(
  trackWidth: number,
  wheelRadius: number,
): DifferentialDriveGeometry {
  return { trackWidth, wheelRadius };
}

/** Create a Pose2D */
export function pose2d(x: number, y: number, theta: number): Pose2D {
  return { x, y, theta };
}

/** Create a zero Pose2D (origin) */
export function zeroPose(): Pose2D {
  return { x: 0, y: 0, theta: 0 };
}
