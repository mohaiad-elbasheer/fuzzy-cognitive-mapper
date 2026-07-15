/**
 * Built-in sample models so a first-time user can explore a working map
 * without building one from scratch. Weights are illustrative defaults,
 * not empirical estimates.
 */

export interface SampleNode {
  id: string;
  label: string;
  initialActivation: number;
  x: number;
  y: number;
}

export interface SampleEdge {
  source: string;
  target: string;
  weight: number;
}

export interface SampleModel {
  id: string;
  name: string;
  description: string;
  nodes: SampleNode[];
  edges: SampleEdge[];
}

export const SAMPLE_MODELS: SampleModel[] = [
  {
    id: 'sustainability',
    name: 'Urban Sustainability',
    description: 'How industry, emissions, and policy interact in a city system',
    nodes: [
      { id: 's1', label: 'Industrial Activity', initialActivation: 0.7, x: 0, y: 100 },
      { id: 's2', label: 'Air Pollution', initialActivation: 0.5, x: 260, y: 0 },
      { id: 's3', label: 'Public Health', initialActivation: 0.6, x: 520, y: 60 },
      { id: 's4', label: 'Environmental Regulation', initialActivation: 0.4, x: 260, y: 260 },
      { id: 's5', label: 'Green Investment', initialActivation: 0.3, x: 520, y: 300 },
      { id: 's6', label: 'Quality of Life', initialActivation: 0.5, x: 780, y: 160 },
    ],
    edges: [
      { source: 's1', target: 's2', weight: 0.8 },
      { source: 's2', target: 's3', weight: -0.7 },
      { source: 's2', target: 's4', weight: 0.6 },
      { source: 's4', target: 's1', weight: -0.4 },
      { source: 's4', target: 's5', weight: 0.6 },
      { source: 's5', target: 's2', weight: -0.5 },
      { source: 's3', target: 's6', weight: 0.8 },
      { source: 's5', target: 's6', weight: 0.4 },
    ],
  },
  {
    id: 'project-risk',
    name: 'Project Risk',
    description: 'Schedule pressure, quality, and team morale in a delivery project',
    nodes: [
      { id: 'p1', label: 'Schedule Pressure', initialActivation: 0.6, x: 0, y: 80 },
      { id: 'p2', label: 'Overtime', initialActivation: 0.4, x: 260, y: 0 },
      { id: 'p3', label: 'Team Morale', initialActivation: 0.7, x: 260, y: 220 },
      { id: 'p4', label: 'Defect Rate', initialActivation: 0.3, x: 520, y: 80 },
      { id: 'p5', label: 'Rework', initialActivation: 0.2, x: 780, y: 0 },
      { id: 'p6', label: 'Delivery Confidence', initialActivation: 0.6, x: 780, y: 220 },
    ],
    edges: [
      { source: 'p1', target: 'p2', weight: 0.8 },
      { source: 'p2', target: 'p3', weight: -0.6 },
      { source: 'p2', target: 'p4', weight: 0.5 },
      { source: 'p3', target: 'p4', weight: -0.5 },
      { source: 'p4', target: 'p5', weight: 0.9 },
      { source: 'p5', target: 'p1', weight: 0.6 },
      { source: 'p4', target: 'p6', weight: -0.7 },
      { source: 'p3', target: 'p6', weight: 0.5 },
    ],
  },
  {
    id: 'supply-chain',
    name: 'Supply-Chain Resilience',
    description: 'Disruption, inventory buffers, and supplier diversity',
    nodes: [
      { id: 'c1', label: 'Supply Disruption', initialActivation: 0.5, x: 0, y: 120 },
      { id: 'c2', label: 'Inventory Buffer', initialActivation: 0.4, x: 260, y: 0 },
      { id: 'c3', label: 'Supplier Diversity', initialActivation: 0.3, x: 260, y: 260 },
      { id: 'c4', label: 'Delivery Reliability', initialActivation: 0.7, x: 520, y: 120 },
      { id: 'c5', label: 'Customer Trust', initialActivation: 0.6, x: 780, y: 40 },
      { id: 'c6', label: 'Operating Cost', initialActivation: 0.5, x: 780, y: 240 },
    ],
    edges: [
      { source: 'c1', target: 'c4', weight: -0.8 },
      { source: 'c2', target: 'c4', weight: 0.6 },
      { source: 'c3', target: 'c1', weight: -0.5 },
      { source: 'c4', target: 'c5', weight: 0.8 },
      { source: 'c2', target: 'c6', weight: 0.5 },
      { source: 'c3', target: 'c6', weight: 0.4 },
      { source: 'c5', target: 'c2', weight: -0.3 },
      { source: 'c1', target: 'c2', weight: 0.4 },
    ],
  },
];
