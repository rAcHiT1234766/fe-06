import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const srcDir = join(import.meta.dirname, '../..');

// Read from disk because Vitest hands CSS imports to tests as empty strings, even with `?raw`.
const sourceFiles = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
  .map((file) => file.replaceAll('\\', '/'))
  .filter((file) => /\.(tsx?|css)$/.test(file))
  .filter((file) => !/\.test(-d)?\.tsx?$/.test(file) && file !== 'core/theme/defaults.ts');

// A brand must be able to change every colour, font and radius, so none may be written into a component.
const hardcodedStyles = [
  /#[0-9a-f]{3,8}\b/i,
  /\b(rgb|hsl)a?\(/i,
  /\b(serif|sans-serif|monospace|system-ui)\b/i,
  /border-?radius:\s*\d/i,
];

it('FR-2.6 keeps hardcoded colours, fonts and radii out of every component', () => {
  expect(sourceFiles).toContain('react/styles/widget.css');
  const offenders = sourceFiles.flatMap((file) => {
    const text = readFileSync(join(srcDir, file), 'utf8');
    return hardcodedStyles.filter((pattern) => pattern.test(text)).map((pattern) => `${file} ${pattern}`);
  });
  expect(offenders).toEqual([]);
});
