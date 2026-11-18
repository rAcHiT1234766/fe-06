import type { ColorTokens } from '../../src';
import { defaultTheme } from '../../src/core/theme/defaults';

const swatchStyle = {
  display: 'inline-block',
  inlineSize: 14,
  blockSize: 14,
  marginInlineEnd: 6,
  borderRadius: 3,
  boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 25%)',
  verticalAlign: 'middle',
};

function Swatches({ colors }: { colors: string | string[] }) {
  const list = Array.isArray(colors) ? colors : [colors];
  return (
    <span>
      {list.map((color, index) => (
        <span key={index} style={{ ...swatchStyle, background: color }} title={color} />
      ))}
      {!Array.isArray(colors) && <code>{colors}</code>}
    </span>
  );
}

/**
 * Every colour token with its default in each mode. The descriptions are the JSDoc of
 * `ColorTokens`, passed in from the generated property docs.
 */
export function TokenTable({ descriptions }: { descriptions: Record<string, string> }) {
  const names = Object.keys(defaultTheme.light) as (keyof ColorTokens)[];
  return (
    <table>
      <thead>
        <tr>
          <th>Token</th>
          <th>Used for</th>
          <th>Light default</th>
          <th>Dark default</th>
        </tr>
      </thead>
      <tbody>
        {names.map((name) => (
          <tr key={name}>
            <td>
              <code>{name}</code>
            </td>
            <td>{descriptions[name]}</td>
            <td>
              <Swatches colors={defaultTheme.light[name]} />
            </td>
            <td>
              <Swatches colors={defaultTheme.dark[name]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
