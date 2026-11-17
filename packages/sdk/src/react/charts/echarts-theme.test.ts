import { describe, expect, it } from 'vitest';
import { createTheme, resolveTheme } from '../../core/theme/create-theme';
import { buildEChartsTheme } from './echarts-theme';

describe('buildEChartsTheme', () => {
  it('FR-2.4 colours series, axes, legend and tooltip from the resolved theme', () => {
    const theme = createTheme({
      mode: 'dark',
      dark: { chart: ['#ff0000', '#00ff00'], border: '#333333', textMuted: '#999999' },
      typography: { fontFamily: 'Georgia, serif' },
    });
    const resolved = resolveTheme(theme, false);
    const chartTheme = buildEChartsTheme(resolved);

    expect(chartTheme.color).toEqual(['#ff0000', '#00ff00']);
    expect(chartTheme.textStyle).toEqual({ fontFamily: 'Georgia, serif', color: theme.dark.text });
    expect(chartTheme.valueAxis.axisLabel.color).toBe('#999999');
    expect(chartTheme.categoryAxis.splitLine.lineStyle.color).toBe('#333333');
    expect(chartTheme.tooltip).toMatchObject({
      backgroundColor: theme.dark.surfaceRaised,
      textStyle: { color: theme.dark.text },
    });
  });
});
