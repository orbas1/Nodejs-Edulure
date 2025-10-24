import 'package:flutter/material.dart';

import 'design_tokens.dart';

Color _parseColor(String? value, Color fallback) {
  if (value == null) {
    return fallback;
  }
  final trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    final hex = trimmed.replaceFirst('#', '');
    final buffer = StringBuffer();
    if (hex.length == 6) {
      buffer.write('ff');
    }
    buffer.write(hex.toLowerCase());
    final parsed = int.tryParse(buffer.toString(), radix: 16);
    if (parsed != null) {
      return Color(parsed);
    }
  }
  if (trimmed.startsWith('rgb')) {
    final match = RegExp(r'rgba?\(([^)]+)\)').firstMatch(trimmed);
    if (match != null) {
      final parts = match.group(1)!.split(',').map((part) => part.trim()).toList();
      if (parts.length >= 3) {
        final r = double.tryParse(parts[0]) ?? 0;
        final g = double.tryParse(parts[1]) ?? 0;
        final b = double.tryParse(parts[2]) ?? 0;
        final opacity = parts.length == 4 ? double.tryParse(parts[3]) ?? 1 : 1;
        return Color.fromRGBO(r.toInt(), g.toInt(), b.toInt(), opacity.clamp(0, 1));
      }
    }
  }
  return fallback;
}

class AppTheme {
  const AppTheme._();

  static ThemeData light({TextTheme? textTheme}) {
    return _buildTheme(mode: 'light', textTheme: textTheme ?? ThemeData.light().textTheme);
  }

  static ThemeData dark({TextTheme? textTheme}) {
    return _buildTheme(mode: 'dark', textTheme: textTheme ?? ThemeData.dark().textTheme);
  }

  static ThemeData _buildTheme({required String mode, required TextTheme textTheme}) {
    final tokens = kDesignTokenMap[mode] ?? const {};
    final fallbackPrimary = mode == 'dark' ? const Color(0xFF2D62FF) : const Color(0xFF2D62FF);
    final primary = _parseColor(tokens['--color-primary'], fallbackPrimary);
    final surface = _parseColor(tokens['--color-surface'], mode == 'dark' ? const Color(0xFF0F172A) : Colors.white);
    final surfaceMuted = _parseColor(
      tokens['--color-surface-muted'],
      mode == 'dark' ? const Color(0xFF111C33) : const Color(0xFFF8FAFC),
    );
    final textColour = _parseColor(
      tokens['--color-text'],
      mode == 'dark' ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A),
    );
    final secondary = _parseColor(tokens['--color-emerald'], const Color(0xFF10B981));
    final error = _parseColor(tokens['--color-rose'], const Color(0xFFF43F5E));

    final brightness = mode == 'dark' ? Brightness.dark : Brightness.light;

    final colourScheme = ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: Colors.white,
      secondary: secondary,
      onSecondary: Colors.white,
      error: error,
      onError: Colors.white,
      surface: surface,
      onSurface: textColour,
      background: surfaceMuted,
      onBackground: textColour,
      tertiary: _parseColor(tokens['--color-amber'], const Color(0xFFF59E0B)),
      shadow: _parseColor(tokens['--shadow-card'], const Color(0x1A0F172A)),
      surfaceTint: primary,
    );

    return ThemeData(
      brightness: brightness,
      colorScheme: colourScheme,
      scaffoldBackgroundColor: surface,
      textTheme: textTheme.apply(bodyColor: textColour, displayColor: textColour),
      useMaterial3: true,
      cardColor: surfaceMuted,
      canvasColor: surface,
      dividerColor: _parseColor(tokens['--color-border'], const Color(0x1E0F172A)),
      dialogBackgroundColor: surface,
    );
  }
}
