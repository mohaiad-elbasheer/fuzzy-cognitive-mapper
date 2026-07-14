export type ExperimentTheme = 'modern' | 'academic';

export const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export const chartTooltipStyle = (theme: ExperimentTheme) => ({
  backgroundColor: theme === 'modern' ? '#1a1a2e' : '#fff',
  border: theme === 'modern' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
  borderRadius: '8px',
  color: theme === 'modern' ? '#fff' : '#1e293b',
});

export const chartAxisColor = (theme: ExperimentTheme) =>
  theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b';

export const chartGridColor = (theme: ExperimentTheme) =>
  theme === 'modern' ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
