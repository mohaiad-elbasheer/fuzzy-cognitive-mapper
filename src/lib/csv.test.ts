import { describe, it, expect } from 'vitest';
import { matrixToCSV, parseMatrixCSV, parseCSV } from './csv';
import { FCMNode, FCMEdge } from '../types';

const node = (id: string, label: string): FCMNode => ({
  id,
  label,
  activation: 0.5,
  initialActivation: 0.5,
});

const edge = (source: string, target: string, weight: number): FCMEdge => ({
  id: `e${source}-${target}`,
  source,
  target,
  weight,
});

describe('parseCSV', () => {
  it('parses quoted cells containing commas and quotes', () => {
    const rows = parseCSV('a,"b, c","d""e"\n1,2,3\n');
    expect(rows).toEqual([
      ['a', 'b, c', 'd"e'],
      ['1', '2', '3'],
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCSV('a,b\r\nc,d\r\n')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('matrixToCSV / parseMatrixCSV', () => {
  it('round-trips a small map', () => {
    const nodes = [node('1', 'Economy'), node('2', 'Environment'), node('3', 'Policy')];
    const edges = [edge('1', '2', 0.8), edge('3', '1', 0.5), edge('3', '2', -0.4)];

    const csv = matrixToCSV(nodes, edges);
    const parsed = parseMatrixCSV(csv);

    expect(parsed.nodes.map(n => n.label)).toEqual(['Economy', 'Environment', 'Policy']);
    expect(parsed.edges).toHaveLength(3);

    const byLabels = (src: string, tgt: string) => {
      const s = parsed.nodes.find(n => n.label === src)!;
      const t = parsed.nodes.find(n => n.label === tgt)!;
      return parsed.edges.find(e => e.source === s.id && e.target === t.id);
    };
    expect(byLabels('Economy', 'Environment')?.weight).toBe(0.8);
    expect(byLabels('Policy', 'Economy')?.weight).toBe(0.5);
    expect(byLabels('Policy', 'Environment')?.weight).toBe(-0.4);
  });

  it('escapes labels containing commas', () => {
    const nodes = [node('1', 'GDP, real'), node('2', 'Inflation')];
    const csv = matrixToCSV(nodes, [edge('1', '2', 0.3)]);
    const parsed = parseMatrixCSV(csv);
    expect(parsed.nodes[0].label).toBe('GDP, real');
    expect(parsed.edges[0].weight).toBe(0.3);
  });

  it('rejects non-square matrices', () => {
    expect(() => parseMatrixCSV(',A,B\nA,0,1\n')).toThrow(/square/);
  });

  it('rejects out-of-range weights', () => {
    expect(() => parseMatrixCSV(',A,B\nA,0,2\nB,0,0\n')).toThrow(/outside/);
  });

  it('rejects duplicate labels', () => {
    expect(() => parseMatrixCSV(',A,A\nA,0,0\nA,0,0\n')).toThrow(/Duplicate/);
  });

  it('rejects rows out of order', () => {
    expect(() => parseMatrixCSV(',A,B\nB,0,0\nA,0,0\n')).toThrow(/header order/);
  });

  it('treats empty cells as zero weight', () => {
    const parsed = parseMatrixCSV(',A,B\nA,0,\nB,,0\n');
    expect(parsed.edges).toHaveLength(0);
  });
});
