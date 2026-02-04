import { describe, expect, it } from 'bun:test';
import {
  prmBuild,
  prmQuery,
  prmPlan,
  DEFAULT_PRM_CONFIG,
} from './prm.ts';
import { point2d } from './result-types.ts';
import { dist2d } from './rrt.ts';

const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
const noObstacles = () => true;

describe('prmBuild', () => {
  it('creates correct number of nodes', () => {
    const roadmap = prmBuild(bounds, noObstacles, { ...DEFAULT_PRM_CONFIG, numSamples: 50 }, 42);
    expect(roadmap.nodes.length).toBe(50);
  });

  it('nodes are within bounds', () => {
    const roadmap = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    for (const node of roadmap.nodes) {
      expect(node.point.x).toBeGreaterThanOrEqual(0);
      expect(node.point.x).toBeLessThanOrEqual(10);
      expect(node.point.y).toBeGreaterThanOrEqual(0);
      expect(node.point.y).toBeLessThanOrEqual(10);
    }
  });

  it('nodes have neighbors', () => {
    const roadmap = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    const connected = roadmap.nodes.filter((n) => n.neighbors.length > 0);
    expect(connected.length).toBeGreaterThan(0);
  });

  it('deterministic with same seed', () => {
    const r1 = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    const r2 = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    expect(r1.nodes.length).toBe(r2.nodes.length);
    for (let i = 0; i < r1.nodes.length; i++) {
      expect(r1.nodes[i].point.x).toBe(r2.nodes[i].point.x);
      expect(r1.nodes[i].point.y).toBe(r2.nodes[i].point.y);
    }
  });

  it('respects collision checker during connection', () => {
    // Block all connections
    const blocked = () => false;
    const roadmap = prmBuild(bounds, blocked, DEFAULT_PRM_CONFIG, 42);
    for (const node of roadmap.nodes) {
      expect(node.neighbors.length).toBe(0);
    }
  });

  it('neighbor edges are bidirectional', () => {
    const roadmap = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    for (let i = 0; i < roadmap.nodes.length; i++) {
      for (const j of roadmap.nodes[i].neighbors) {
        expect(roadmap.nodes[j].neighbors).toContain(i);
      }
    }
  });
});

describe('prmQuery', () => {
  it('finds path in connected roadmap', () => {
    const roadmap = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    const result = prmQuery(roadmap, point2d(1, 1), point2d(9, 9));
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.cost).toBeGreaterThan(0);
    expect(result.cost).toBeLessThan(Infinity);
  });

  it('path starts at start and ends at goal', () => {
    const roadmap = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    const start = point2d(1, 1);
    const goal = point2d(9, 9);
    const result = prmQuery(roadmap, start, goal);
    expect(result.success).toBe(true);
    expect(result.path[0].x).toBeCloseTo(1, 8);
    expect(result.path[0].y).toBeCloseTo(1, 8);
    expect(result.path[result.path.length - 1].x).toBeCloseTo(9, 8);
    expect(result.path[result.path.length - 1].y).toBeCloseTo(9, 8);
  });

  it('fails when start cannot connect to roadmap', () => {
    const roadmap = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    // Point far outside with tiny radius
    const result = prmQuery(roadmap, point2d(100, 100), point2d(5, 5), 0.01);
    expect(result.success).toBe(false);
  });

  it('fails when goal cannot connect to roadmap', () => {
    const roadmap = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    const result = prmQuery(roadmap, point2d(5, 5), point2d(100, 100), 0.01);
    expect(result.success).toBe(false);
  });

  it('supports multi-query on same roadmap', () => {
    const roadmap = prmBuild(bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    const r1 = prmQuery(roadmap, point2d(1, 1), point2d(9, 9));
    const r2 = prmQuery(roadmap, point2d(2, 2), point2d(8, 8));
    const r3 = prmQuery(roadmap, point2d(0, 5), point2d(10, 5));
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
  });

  it('fails on disconnected roadmap', () => {
    const blocked = () => false;
    const roadmap = prmBuild(bounds, blocked, DEFAULT_PRM_CONFIG, 42);
    // Even if start/goal connect, graph has no edges
    const result = prmQuery(roadmap, point2d(5, 5), point2d(5.1, 5.1), 100);
    expect(result.success).toBe(false);
  });
});

describe('prmPlan', () => {
  it('finds path in free space', () => {
    const result = prmPlan(point2d(0, 0), point2d(9, 9), bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.cost).toBeGreaterThan(0);
  });

  it('deterministic with same seed', () => {
    const r1 = prmPlan(point2d(1, 1), point2d(8, 8), bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    const r2 = prmPlan(point2d(1, 1), point2d(8, 8), bounds, noObstacles, DEFAULT_PRM_CONFIG, 42);
    expect(r1.cost).toBeCloseTo(r2.cost, 10);
    expect(r1.path.length).toBe(r2.path.length);
  });

  it('finds path around wall', () => {
    const isCollisionFree = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = from.x + t * (to.x - from.x);
        const y = from.y + t * (to.y - from.y);
        if (Math.abs(x - 5) < 0.1 && y < 8) return false;
      }
      return true;
    };
    const config = { ...DEFAULT_PRM_CONFIG, numSamples: 500, connectionRadius: 3.0 };
    const result = prmPlan(point2d(1, 1), point2d(9, 1), bounds, isCollisionFree, config, 42);
    expect(result.success).toBe(true);
    expect(result.path.length).toBeGreaterThan(2);
  });

  it('cost is reasonable for straight-line path', () => {
    const config = { ...DEFAULT_PRM_CONFIG, numSamples: 500 };
    const result = prmPlan(point2d(0, 5), point2d(10, 5), bounds, noObstacles, config, 42);
    expect(result.success).toBe(true);
    const optimal = dist2d(point2d(0, 5), point2d(10, 5));
    // PRM should be within 3x of optimal (it routes through random samples)
    expect(result.cost).toBeLessThan(optimal * 3);
  });
});
