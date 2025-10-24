import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/design/design_tokens.dart';

Color _fallbackColor(String token, Brightness brightness) {
  final color = DesignTokensManifest.color(
    token,
    brightness: brightness,
    highContrast: false,
  );
  if (color != null) {
    return color;
  }
  switch (token) {
    case '--color-surface':
      return brightness == Brightness.dark ? const Color(0xFF0F172A) : Colors.white;
    case '--color-text':
      return brightness == Brightness.dark ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A);
    case '--color-text-muted':
      return brightness == Brightness.dark ? const Color(0xFFCBD5F5) : const Color(0xFF475569);
    case '--color-primary':
      return const Color(0xFF2D62FF);
    case '--color-emerald':
      return const Color(0xFF10B981);
    case '--color-amber':
      return const Color(0xFFF59E0B);
    default:
      return const Color(0xFF0F172A);
  }
}

double _fallbackDimension(String token, {double defaultValue = 16}) {
  return DesignTokensManifest.spacing(token) ?? defaultValue;
}

double _fallbackRadius(String token, {String? variant, double defaultValue = 24}) {
  return DesignTokensManifest.radius(token, variant: variant) ?? defaultValue;
}

double _fallbackLetterSpacing(String token, {double defaultValue = 0.4}) {
  return DesignTokensManifest.letterSpacing(token) ?? defaultValue;
}

ThemeData buildAppTheme({
  Brightness brightness = Brightness.light,
  bool highContrast = false,
}) {
  final surface = DesignTokensManifest.color(
        '--color-surface',
        brightness: brightness,
        highContrast: highContrast,
      ) ??
      _fallbackColor('--color-surface', brightness);
  final onSurface = DesignTokensManifest.color(
        '--color-text',
        brightness: brightness,
        highContrast: highContrast,
      ) ??
      _fallbackColor('--color-text', brightness);
  final mutedText = DesignTokensManifest.color(
        '--color-text-muted',
        brightness: brightness,
        highContrast: highContrast,
      ) ??
      _fallbackColor('--color-text-muted', brightness);
  final primary = DesignTokensManifest.color(
        '--color-primary',
        brightness: brightness,
        highContrast: highContrast,
      ) ??
      _fallbackColor('--color-primary', brightness);
  final secondary = DesignTokensManifest.color(
        '--color-emerald',
        brightness: brightness,
        highContrast: highContrast,
      ) ??
      _fallbackColor('--color-emerald', brightness);
  final tertiary = DesignTokensManifest.color(
        '--color-amber',
        brightness: brightness,
        highContrast: highContrast,
      ) ??
      _fallbackColor('--color-amber', brightness);

  final baseTextTheme =
      brightness == Brightness.dark ? ThemeData.dark().textTheme : ThemeData.light().textTheme;
  final textTheme = GoogleFonts.interTextTheme(baseTextTheme).apply(
    bodyColor: onSurface,
    displayColor: onSurface,
  );

  final borderRadius = BorderRadius.circular(_fallbackRadius('--radius-xl', defaultValue: 32));
  final chipRadius = BorderRadius.circular(_fallbackRadius('--radius-pill', defaultValue: 999));

  final colorScheme = ColorScheme(
    brightness: brightness,
    primary: primary,
    onPrimary: Colors.white,
    secondary: secondary,
    onSecondary: Colors.white,
    error: const Color(0xFFDC2626),
    onError: Colors.white,
    surface: surface,
    onSurface: onSurface,
    tertiary: tertiary,
    onTertiary: Colors.white,
    surfaceTint: primary.withOpacity(0.08),
    shadow: Colors.black.withOpacity(0.25),
    outline: mutedText.withOpacity(0.4),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: surface,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      elevation: 0,
      titleTextStyle: GoogleFonts.inter(
        fontWeight: FontWeight.w600,
        fontSize: 20,
        color: onSurface,
      ),
      iconTheme: IconThemeData(color: mutedText),
    ),
    cardTheme: CardTheme(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: borderRadius),
      margin: EdgeInsets.zero,
      shadowColor: DesignTokensManifest.color(
            '--shadow-card',
            brightness: brightness,
            highContrast: highContrast,
          ) ??
          Colors.black.withOpacity(brightness == Brightness.dark ? 0.4 : 0.18),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: primary.withOpacity(0.08),
      selectedColor: primary.withOpacity(0.12),
      disabledColor: surface.withOpacity(0.35),
      labelStyle: textTheme.labelMedium?.copyWith(
        color: primary,
        fontWeight: FontWeight.w600,
        letterSpacing: _fallbackLetterSpacing('--form-label-letterspacing'),
      ),
      secondaryLabelStyle: textTheme.labelMedium?.copyWith(color: primary),
      padding: EdgeInsets.symmetric(
        horizontal: _fallbackDimension('--space-3', defaultValue: 10) / 2,
        vertical: _fallbackDimension('--space-2', defaultValue: 8) / 2,
      ),
      shape: StadiumBorder(
        side: BorderSide(color: primary.withOpacity(0.15)),
      ),
      elevation: 0,
      pressElevation: 0,
      brightness: brightness,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: DesignTokensManifest.color(
            '--form-field-surface',
            brightness: brightness,
            highContrast: highContrast,
          ) ??
          surface,
      contentPadding: EdgeInsets.symmetric(
        horizontal: _fallbackDimension('--form-field-padding-x', defaultValue: 20),
        vertical: _fallbackDimension('--form-field-padding-y', defaultValue: 14),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_fallbackRadius('--radius-lg', defaultValue: 20)),
        borderSide: BorderSide(
          color: DesignTokensManifest.color(
                '--form-field-border',
                brightness: brightness,
                highContrast: highContrast,
              ) ??
              mutedText.withOpacity(0.35),
          width: 1.2,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_fallbackRadius('--radius-lg', defaultValue: 20)),
        borderSide: BorderSide(
          color: DesignTokensManifest.color(
                '--form-field-border',
                brightness: brightness,
                highContrast: highContrast,
              ) ??
              mutedText.withOpacity(0.35),
          width: 1.2,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_fallbackRadius('--radius-lg', defaultValue: 20)),
        borderSide: BorderSide(
          color: DesignTokensManifest.color(
                '--form-field-border-strong',
                brightness: brightness,
                highContrast: highContrast,
              ) ??
              primary,
          width: 1.6,
        ),
      ),
      labelStyle: textTheme.labelLarge?.copyWith(color: mutedText),
    ),
    badgeTheme: BadgeThemeData(
      backgroundColor: primary.withOpacity(0.12),
      textColor: primary,
      largeSize: _fallbackDimension('--space-6', defaultValue: 20),
      padding: EdgeInsets.symmetric(
        horizontal: _fallbackDimension('--space-3', defaultValue: 12) / 2,
        vertical: _fallbackDimension('--space-2', defaultValue: 8) / 2,
      ),
      shape: StadiumBorder(borderRadius: chipRadius),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        padding: EdgeInsets.symmetric(
          horizontal: _fallbackDimension('--space-6', defaultValue: 24),
          vertical: _fallbackDimension('--space-3', defaultValue: 12),
        ),
        textStyle: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: borderRadius),
        elevation: 0,
      ),
    ),
  );
}
