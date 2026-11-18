// Writes the API reference page from the package's public types: every export of the npm entry
// and of the element entry, with its JSDoc, signature and properties. It fails when an export, or
// any of its properties or methods, has no JSDoc (FR-6.2), so neither the reference nor the
// editor tooltips can fall behind the code.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const output = new URL('../stories/generated/api-reference.md', import.meta.url);

const configFile = ts.readConfigFile(`${packageDir}tsconfig.build.json`, (path) =>
  ts.sys.readFile(path),
);
const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageDir);
const entries = { npm: 'src/index.ts', element: 'src/element-types.ts' };
const program = ts.createProgram(
  Object.values(entries).map((entry) => `${packageDir}${entry}`),
  options,
);
const checker = program.getTypeChecker();

const missingDocs: string[] = [];
let documenting = '';

// `{@link Name}` reads as a code name on the page.
const docOf = (symbol: ts.Symbol) =>
  ts
    .displayPartsToString(symbol.getDocumentationComment(checker))
    .replace(/\{@link\s+([^}\s|]+)[^}]*\}/g, '`$1`')
    .trim();

// Properties inherited from the DOM or React types, such as every HTML event, are not this
// package's API and would bury its own.
const isOwnDeclaration = (declaration: ts.Declaration | undefined) =>
  declaration !== undefined &&
  !declaration.getSourceFile().fileName.includes('/node_modules/') &&
  !program.isSourceFileDefaultLibrary(declaration.getSourceFile());

const examplesOf = (symbol: ts.Symbol) =>
  symbol
    .getJsDocTags()
    .filter((tag) => tag.name === 'example')
    .map((tag) => ts.displayPartsToString(tag.text).trim());

// Table cells cannot hold line breaks or unescaped pipes.
const cell = (text: string) => text.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|');
const code = (text: string) => `\`${cell(text)}\``;

function typeText(node: ts.Node | undefined, fallback: ts.Type) {
  return node ? node.getText().replace(/\s+/g, ' ') : checker.typeToString(fallback);
}

function propertiesTable(type: ts.Type, location: ts.Node) {
  const own = checker
    .getPropertiesOfType(type)
    .filter((property) =>
      isOwnDeclaration(property.valueDeclaration ?? property.declarations?.[0]),
    );
  const rows = own.map((property) => {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const propertyType = checker.getTypeOfSymbolAtLocation(property, location);
    const typeNode =
      declaration && (ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration))
        ? declaration.type
        : undefined;
    const isOptional = (property.flags & ts.SymbolFlags.Optional) !== 0;
    if (!docOf(property)) missingDocs.push(`${documenting}.${property.name}`);
    return `| ${code(property.name)}${isOptional ? '' : ' (required)'} | ${code(typeText(typeNode, propertyType))} | ${cell(docOf(property))} |`;
  });
  if (rows.length === 0) return '';
  return ['| Property | Type | Description |', '|---|---|---|', ...rows].join('\n');
}

function classMembers(declaration: ts.ClassDeclaration) {
  const rows: string[] = [];
  const seen = new Set<string>();
  for (const member of declaration.members) {
    const name = member.name?.getText();
    if (!name || name.startsWith('#') || name.endsWith('Callback') || seen.has(name)) continue;
    const isStatic = ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static;
    if (isStatic) continue;
    const symbol = checker.getSymbolAtLocation(member.name!);
    if (!symbol) continue;
    seen.add(name);
    if (!docOf(symbol)) missingDocs.push(`${documenting}.${name}`);
    if (ts.isMethodDeclaration(member)) {
      const signatures = checker.getTypeOfSymbolAtLocation(symbol, member).getCallSignatures();
      const first = signatures[0];
      const signature = first ? checker.signatureToString(first) : '';
      rows.push(`| ${code(`${name}${signature.replace(/ =>/, ':')}`)} | ${cell(docOf(symbol))} |`);
    } else if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
      const typeNode = ts.isGetAccessorDeclaration(member) ? member.type : undefined;
      const type = checker.getTypeOfSymbolAtLocation(symbol, member);
      rows.push(`| ${code(`${name}: ${typeText(typeNode, type)}`)} | ${cell(docOf(symbol))} |`);
    }
  }
  return ['| Member | Description |', '|---|---|', ...rows].join('\n');
}

function describe(symbol: ts.Symbol, entryName: string) {
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declaration = target.declarations?.[0];
  if (!declaration) return '';
  const name = symbol.name;
  documenting = `${entryName}: ${name}`;
  const doc = docOf(target);
  if (!doc) missingDocs.push(documenting);

  const parts = [`### ${name}`, doc];
  if (ts.isFunctionDeclaration(declaration)) {
    const type = checker.getTypeOfSymbolAtLocation(target, declaration);
    const [signature] = type.getCallSignatures();
    if (signature)
      parts.push(`\`\`\`ts\nfunction ${name}${checker.signatureToString(signature)}\n\`\`\``);
  } else if (ts.isClassDeclaration(declaration)) {
    parts.push(classMembers(declaration));
  } else if (ts.isInterfaceDeclaration(declaration)) {
    parts.push(propertiesTable(checker.getDeclaredTypeOfSymbol(target), declaration));
  } else if (ts.isTypeAliasDeclaration(declaration)) {
    const parameters = declaration.typeParameters
      ? `<${declaration.typeParameters.map((parameter) => parameter.getText()).join(', ')}>`
      : '';
    parts.push(`\`\`\`ts\ntype ${name}${parameters} = ${declaration.type.getText()}\n\`\`\``);
  }
  for (const example of examplesOf(target)) parts.push(`\`\`\`tsx\n${example}\n\`\`\``);
  return parts.filter(Boolean).join('\n\n');
}

function exportsOf(entry: string) {
  const sourceFile = program.getSourceFile(`${packageDir}${entry}`)!;
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)!;
  return checker.getExportsOfModule(moduleSymbol);
}

const kindOf = (symbol: ts.Symbol) => {
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declaration = target.declarations?.[0];
  if (declaration && ts.isFunctionDeclaration(declaration)) return 'Components';
  if (/^DashKit(Element|Handle)/.test(symbol.name)) return 'The custom element';
  return 'Types';
};

const npmExports = exportsOf(entries.npm);
const npmNames = new Set(npmExports.map((symbol) => symbol.name));
const sections: string[] = [];
for (const kind of ['Components', 'The custom element', 'Types']) {
  const symbols = npmExports
    .filter((symbol) => kindOf(symbol) === kind)
    .sort((a, b) => a.name.localeCompare(b.name));
  sections.push(`## ${kind}`, ...symbols.map((symbol) => describe(symbol, '@dashkit/sdk')));
}
// The element entry re-exports the element's types; only what it adds is listed again.
const elementOnly = exportsOf(entries.element).filter((symbol) => !npmNames.has(symbol.name));
sections.push(
  '## `@dashkit/sdk/element`\n\nImporting the element entry defines `<dashkit-dashboard>` and adds its types: the tag name maps to `DashKitElement` in `querySelector` and `createElement`, each `dashkit:*` event has its own `detail` type, and JSX accepts the element.',
  ...elementOnly.map((symbol) => describe(symbol, '@dashkit/sdk/element')),
);

if (missingDocs.length > 0) {
  console.error(`These public exports, properties or methods have no JSDoc comment:\n${missingDocs.join('\n')}`);
  process.exitCode = 1;
} else {
  const page = [
    '<!-- Generated by scripts/api-reference.ts from the source; do not edit. -->',
    'Every public export of `@dashkit/sdk`, with the same descriptions an editor shows on hover.',
    ...sections,
  ].join('\n\n');
  mkdirSync(new URL('.', output), { recursive: true });
  writeFileSync(output, `${page}\n`);
  console.log(`API reference: ${npmExports.length + elementOnly.length} exports documented.`);
}
