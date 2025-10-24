import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(repoRoot, 'docs', 'design-system', 'tokens.json');
const cssOutputPath = path.join(repoRoot, 'frontend-reactjs', 'src', 'styles', 'tokens.css');
const dartOutputDir = path.join(repoRoot, 'Edulure-Flutter', 'lib', 'core', 'design');
const dartOutputPath = path.join(dartOutputDir, 'design_tokens.dart');

function renderTokenLines(tokens, indent = 2) {
  const padding = ' '.repeat(indent);
  return tokens.map((token) => `${padding}${token.name}: ${token.value};`).join('\n');
}

function buildCss(manifest) {
  const sections = [];
  const rootLines = [':root {'];
  manifest.groups.forEach((group, index) => {
    rootLines.push(`  /* ${group.title} */`);
    rootLines.push(renderTokenLines(group.tokens, 2));
    if (index < manifest.groups.length - 1) {
      rootLines.push('');
    }
  });
  rootLines.push('}');
  sections.push(rootLines.join('\n'));

  const media = manifest.overrides?.media ?? [];
  media.forEach((entry) => {
    const scope = entry.scope ?? ':root';
    const block = [
      `@media ${entry.query} {`,
      `${scope} {`,
      renderTokenLines(entry.tokens, 4),
      '  }',
      '}'
    ].join('\n');
    sections.push(block);
  });

  const attributeOverrides = manifest.overrides?.dataAttributes ?? [];
  attributeOverrides.forEach((entry) => {
    const block = [
      `${entry.selector} {`,
      renderTokenLines(entry.tokens, 2),
      '}'
    ].join('\n');
    sections.push(block);
  });

  const colorSchemes = manifest.overrides?.colorSchemes ?? [];
  colorSchemes.forEach((entry) => {
    const block = [
      `${entry.selector} {`,
      renderTokenLines(entry.tokens, 2),
      '}'
    ].join('\n');
    sections.push(block);
  });

  return `${sections.join('\n\n')}`;
}

function escapeDartString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function mapToDart(map, indent = 2) {
  const padding = ' '.repeat(indent);
  const entries = Object.entries(map)
    .map(([key, value]) => `${padding}'${escapeDartString(key)}': '${escapeDartString(value)}',`)
    .join('\n');
  return `{
${entries}\n${' '.repeat(Math.max(indent - 2, 0))}}`;
}

function buildDart(manifest) {
  const metadataMap = Object.entries(manifest.metadata ?? {}).reduce((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});

  const baseTokens = manifest.groups.reduce((acc, group) => {
    group.tokens.forEach((token) => {
      acc[token.name] = token.value;
    });
    return acc;
  }, {});

  const mediaOverrides = {};
  (manifest.overrides?.media ?? []).forEach((entry) => {
    mediaOverrides[entry.id] = entry.tokens.reduce((acc, token) => {
      acc[token.name] = token.value;
      return acc;
    }, {});
  });

  const dataOverrides = {};
  (manifest.overrides?.dataAttributes ?? []).forEach((entry) => {
    dataOverrides[entry.id] = entry.tokens.reduce((acc, token) => {
      acc[token.name] = token.value;
      return acc;
    }, {});
  });

  const colorSchemes = {};
  (manifest.overrides?.colorSchemes ?? []).forEach((entry) => {
    colorSchemes[entry.selector] = entry.tokens.reduce((acc, token) => {
      acc[token.name] = token.value;
      return acc;
    }, {});
  });

  const dartLines = [];
  dartLines.push('// GENERATED FILE. DO NOT EDIT DIRECTLY.');
  dartLines.push('// Run `npm run design-tokens:sync` from the repo root to regenerate.');
  dartLines.push("import 'dart:ui';");
  dartLines.push('');
  dartLines.push('class DesignTokensManifest {');
  dartLines.push('  static const Map<String, String> metadata = ' + mapToDart(metadataMap, 4) + ';');
  dartLines.push('  static const Map<String, String> base = ' + mapToDart(baseTokens, 4) + ';');

  const mediaEntries = Object.entries(mediaOverrides)
    .map(([key, value]) => `    '${escapeDartString(key)}': ${mapToDart(value, 6)},`)
    .join('\n');
  dartLines.push('  static const Map<String, Map<String, String>> mediaOverrides = {');
  if (mediaEntries.length > 0) {
    dartLines.push(mediaEntries);
  }
  dartLines.push('  };');

  const dataEntries = Object.entries(dataOverrides)
    .map(([key, value]) => `    '${escapeDartString(key)}': ${mapToDart(value, 6)},`)
    .join('\n');
  dartLines.push('  static const Map<String, Map<String, String>> dataOverrides = {');
  if (dataEntries.length > 0) {
    dartLines.push(dataEntries);
  }
  dartLines.push('  };');

  const schemeEntries = Object.entries(colorSchemes)
    .map(([key, value]) => `    '${escapeDartString(key)}': ${mapToDart(value, 6)},`)
    .join('\n');
  dartLines.push('  static const Map<String, Map<String, String>> colorSchemes = {');
  if (schemeEntries.length > 0) {
    dartLines.push(schemeEntries);
  }
  dartLines.push('  };');
  dartLines.push('');

  dartLines.push('  static Map<String, String> _tokensFor({');
  dartLines.push('    Brightness brightness = Brightness.light,');
  dartLines.push('    bool highContrast = false,');
  dartLines.push('    bool compactDensity = false,');
  dartLines.push("    String? radiusVariant,");
  dartLines.push('  }) {');
  dartLines.push('    final tokens = Map<String, String>.from(base);');
  dartLines.push("    if (brightness == Brightness.dark) {");
  dartLines.push("      tokens.addAll(dataOverrides['theme-dark'] ?? const {});");
  dartLines.push('    }');
  dartLines.push('    if (highContrast) {');
  dartLines.push("      tokens.addAll(dataOverrides['contrast-high'] ?? const {});");
  dartLines.push('    }');
  dartLines.push('    if (compactDensity) {');
  dartLines.push("      tokens.addAll(dataOverrides['density-compact'] ?? const {});");
  dartLines.push('    }');
  dartLines.push('    if (radiusVariant == "soft") {');
  dartLines.push("      tokens.addAll(dataOverrides['radius-soft'] ?? const {});");
  dartLines.push('    } else if (radiusVariant == "sharp") {');
  dartLines.push("      tokens.addAll(dataOverrides['radius-sharp'] ?? const {});");
  dartLines.push('    }');
  dartLines.push('    return tokens;');
  dartLines.push('  }');
  dartLines.push('');

  dartLines.push('  static String? raw(String token, {');
  dartLines.push('    Brightness brightness = Brightness.light,');
  dartLines.push('    bool highContrast = false,');
  dartLines.push('    bool compactDensity = false,');
  dartLines.push("    String? radiusVariant,");
  dartLines.push('  }) {');
  dartLines.push('    final tokens = _tokensFor(');
  dartLines.push('      brightness: brightness,');
  dartLines.push('      highContrast: highContrast,');
  dartLines.push('      compactDensity: compactDensity,');
  dartLines.push('      radiusVariant: radiusVariant,');
  dartLines.push('    );');
  dartLines.push('    return tokens[token];');
  dartLines.push('  }');
  dartLines.push('');

  dartLines.push('  static Color? color(String token, {');
  dartLines.push('    Brightness brightness = Brightness.light,');
  dartLines.push('    bool highContrast = false');
  dartLines.push('  }) {');
  dartLines.push('    final value = raw(token, brightness: brightness, highContrast: highContrast);');
  dartLines.push('    return value == null ? null : _parseColor(value);');
  dartLines.push('  }');
  dartLines.push('');

  dartLines.push('  static double? spacing(String token, { bool compact = false }) {');
  dartLines.push('    final value = raw(token, compactDensity: compact);');
  dartLines.push('    return value == null ? null : _parseDimension(value);');
  dartLines.push('  }');
  dartLines.push('');

  dartLines.push('  static double? radius(String token, { String? variant }) {');
  dartLines.push('    final value = raw(token, radiusVariant: variant);');
  dartLines.push('    return value == null ? null : _parseDimension(value);');
  dartLines.push('  }');
  dartLines.push('');

  dartLines.push('  static double? letterSpacing(String token) {');
  dartLines.push('    final value = raw(token);');
  dartLines.push('    return value == null ? null : _parseDimension(value);');
  dartLines.push('  }');
  dartLines.push('');

  dartLines.push('  static double? _parseDimension(String value) {');
  dartLines.push('    final trimmed = value.trim();');
  dartLines.push("    if (trimmed.endsWith('rem')) {");
  dartLines.push("      final number = double.tryParse(trimmed.replaceAll('rem', '').trim());");
  dartLines.push('      return number == null ? null : number * 16;');
  dartLines.push('    }');
  dartLines.push("    if (trimmed.endsWith('em')) {");
  dartLines.push("      final number = double.tryParse(trimmed.replaceAll('em', '').trim());");
  dartLines.push('      return number == null ? null : number * 16;');
  dartLines.push('    }');
  dartLines.push("    if (trimmed.endsWith('px')) {");
  dartLines.push("      return double.tryParse(trimmed.replaceAll('px', '').trim());");
  dartLines.push('    }');
  dartLines.push("    if (trimmed.contains('/')) {");
  dartLines.push("      final parts = trimmed.split('/').map((p) => p.trim()).toList();");
  dartLines.push('      if (parts.length == 2) {');
  dartLines.push('        final numerator = double.tryParse(parts[0]);');
  dartLines.push('        final denominator = double.tryParse(parts[1]);');
  dartLines.push('        if (numerator != null && denominator != null && denominator != 0) {');
  dartLines.push('          return numerator / denominator;');
  dartLines.push('        }');
  dartLines.push('      }');
  dartLines.push('    }');
  dartLines.push('    return double.tryParse(trimmed);');
  dartLines.push('  }');
  dartLines.push('');

  dartLines.push('  static Color? _parseColor(String value) {');
  dartLines.push('    final trimmed = value.trim();');
  dartLines.push("    if (trimmed.startsWith('#')) {");
  dartLines.push('      final hex = trimmed.substring(1);');
  dartLines.push('      final buffer = StringBuffer();');
  dartLines.push('      if (hex.length == 6) {');
  dartLines.push("        buffer.write('ff');");
  dartLines.push('        buffer.write(hex);');
  dartLines.push('      } else if (hex.length == 8) {');
  dartLines.push('        buffer.write(hex);');
  dartLines.push('      } else {');
  dartLines.push('        return null;');
  dartLines.push('      }');
  dartLines.push('      final intValue = int.tryParse(buffer.toString(), radix: 16);');
  dartLines.push('      return intValue == null ? null : Color(intValue);');
  dartLines.push('    }');
  dartLines.push("    if (trimmed.startsWith('rgba')) {");
  dartLines.push("      final inside = trimmed.substring(trimmed.indexOf('(') + 1, trimmed.lastIndexOf(')'));");
  dartLines.push("      final parts = inside.split(',').map((part) => part.trim()).toList();");
  dartLines.push('      if (parts.length != 4) {');
  dartLines.push('        return null;');
  dartLines.push('      }');
  dartLines.push('      final r = double.tryParse(parts[0]);');
  dartLines.push('      final g = double.tryParse(parts[1]);');
  dartLines.push('      final b = double.tryParse(parts[2]);');
  dartLines.push('      final a = double.tryParse(parts[3]);');
  dartLines.push('      if (r == null || g == null || b == null || a == null) {');
  dartLines.push('        return null;');
  dartLines.push('      }');
  dartLines.push('      return Color.fromARGB((a.clamp(0, 1) * 255).round(), r.round(), g.round(), b.round());');
  dartLines.push('    }');
  dartLines.push("    if (trimmed.startsWith('rgb')) {");
  dartLines.push("      final inside = trimmed.substring(trimmed.indexOf('(') + 1, trimmed.lastIndexOf(')'));");
  dartLines.push("      final parts = inside.split(',').map((part) => part.trim()).toList();");
  dartLines.push('      if (parts.length != 3) {');
  dartLines.push('        return null;');
  dartLines.push('      }');
  dartLines.push('      final r = int.tryParse(parts[0]);');
  dartLines.push('      final g = int.tryParse(parts[1]);');
  dartLines.push('      final b = int.tryParse(parts[2]);');
  dartLines.push('      if (r == null || g == null || b == null) {');
  dartLines.push('        return null;');
  dartLines.push('      }');
  dartLines.push('      return Color.fromARGB(255, r, g, b);');
  dartLines.push('    }');
  dartLines.push('    return null;');
  dartLines.push('  }');
  dartLines.push('}');

  return dartLines.join('\n');
}

async function main() {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  await mkdir(path.dirname(cssOutputPath), { recursive: true });
  await mkdir(dartOutputDir, { recursive: true });

  const css = buildCss(manifest);
  await writeFile(cssOutputPath, `${css}\n`);

  const dart = buildDart(manifest);
  await writeFile(dartOutputPath, `${dart}\n`);
}

main().catch((error) => {
  console.error('Failed to sync design tokens', error);
  process.exitCode = 1;
});
