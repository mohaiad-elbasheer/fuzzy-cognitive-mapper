/**
 * CSV adjacency-matrix import/export.
 *
 * Format (compatible with common FCM tooling like FCMapper spreadsheets):
 * the first row and first column hold concept labels, each cell w[i][j] is
 * the causal weight from row-concept i to column-concept j.
 *
 *          ,Concept A,Concept B
 * Concept A,0        ,0.8
 * Concept B,-0.4     ,0
 */

import { FCMNode, FCMEdge } from '../types';

const escapeCell = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/** Minimal CSV parser with quote support; returns rows of cells. */
export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Drop fully-empty trailing rows
  return rows.filter(r => r.some(c => c.trim() !== ''));
};

/** Serialize the FCM as a labeled adjacency-matrix CSV. */
export const matrixToCSV = (nodes: FCMNode[], edges: FCMEdge[]): string => {
  const header = ['', ...nodes.map(n => escapeCell(n.label))].join(',');

  const rows = nodes.map(source => {
    const cells = nodes.map(target => {
      if (source.id === target.id) return '0';
      const edge = edges.find(e => e.source === source.id && e.target === target.id);
      return edge ? String(edge.weight) : '0';
    });
    return [escapeCell(source.label), ...cells].join(',');
  });

  return [header, ...rows].join('\n') + '\n';
};

/**
 * Parse a labeled adjacency-matrix CSV into nodes and edges.
 * Throws with a human-readable message on malformed input.
 */
export const parseMatrixCSV = (csv: string): { nodes: FCMNode[]; edges: FCMEdge[] } => {
  const rows = parseCSV(csv);
  if (rows.length < 2) {
    throw new Error('CSV must have a header row and at least one concept row');
  }

  const labels = rows[0].slice(1).map(l => l.trim());
  if (labels.length === 0 || labels.some(l => l === '')) {
    throw new Error('Header row must list a non-empty label for every concept');
  }

  const seen = new Set<string>();
  for (const label of labels) {
    if (seen.has(label)) throw new Error(`Duplicate concept label: "${label}"`);
    seen.add(label);
  }

  const dataRows = rows.slice(1);
  if (dataRows.length !== labels.length) {
    throw new Error(
      `Matrix must be square: header lists ${labels.length} concepts but there are ${dataRows.length} rows`
    );
  }

  const nodes: FCMNode[] = labels.map((label, i) => ({
    id: `c${i + 1}`,
    label,
    activation: 0.5,
    initialActivation: 0.5,
  }));

  const edges: FCMEdge[] = [];

  dataRows.forEach((row, i) => {
    const rowLabel = (row[0] ?? '').trim();
    if (rowLabel !== labels[i]) {
      throw new Error(
        `Row ${i + 2} is labeled "${rowLabel}" but the header order expects "${labels[i]}"`
      );
    }

    labels.forEach((_, j) => {
      const raw = (row[j + 1] ?? '').trim();
      const weight = raw === '' ? 0 : Number(raw);
      if (Number.isNaN(weight)) {
        throw new Error(`Invalid weight "${raw}" at row "${labels[i]}", column "${labels[j]}"`);
      }
      if (weight < -1 || weight > 1) {
        throw new Error(
          `Weight ${weight} at row "${labels[i]}", column "${labels[j]}" is outside [-1, 1]`
        );
      }
      if (i !== j && weight !== 0) {
        edges.push({
          id: `e${nodes[i].id}-${nodes[j].id}`,
          source: nodes[i].id,
          target: nodes[j].id,
          weight,
        });
      }
    });
  });

  return { nodes, edges };
};
