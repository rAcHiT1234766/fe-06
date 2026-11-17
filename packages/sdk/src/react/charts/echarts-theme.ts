import type { ResolvedTheme } from '../../core/theme/create-theme';

// Built from the same resolved theme as the CSS variables, so charts can never fall out of step
// with the rest of the dashboard.
export function buildEChartsTheme({ colors, typography }: ResolvedTheme) {
  const axis = {
    axisLine: { lineStyle: { color: colors.border } },
    axisTick: { lineStyle: { color: colors.border } },
    axisLabel: { color: colors.textMuted },
    splitLine: { lineStyle: { color: colors.border } },
  };
  return {
    color: colors.chart,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: typography.fontFamily, color: colors.text },
    legend: { textStyle: { color: colors.textMuted }, pageTextStyle: { color: colors.textMuted } },
    tooltip: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      textStyle: { color: colors.text },
    },
    categoryAxis: axis,
    valueAxis: axis,
    pie: { itemStyle: { borderColor: colors.surface }, label: { color: colors.text } },
  };
}
