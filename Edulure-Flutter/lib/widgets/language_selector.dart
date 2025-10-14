import 'package:flutter/material.dart';

import '../services/language_service.dart';

class LanguageSelector extends StatelessWidget {
  const LanguageSelector({
    super.key,
    this.compact = false,
    this.expanded = false,
    this.surfaceColor,
  });

  final bool compact;
  final bool expanded;
  final Color? surfaceColor;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final background = surfaceColor ??
        (compact ? Colors.white : colorScheme.surface.withOpacity(0.95));
    final borderColor = compact
        ? colorScheme.primary.withOpacity(0.2)
        : colorScheme.outlineVariant.withOpacity(0.6);
    final elevation = compact ? 1.0 : 4.0;

    return ValueListenableBuilder<String>(
      valueListenable: LanguageService.listenable(),
      builder: (context, code, _) {
        final options = LanguageService.options;
        final current = LanguageService.currentOption;
        final labelStyle = Theme.of(context).textTheme.labelSmall;
        final primaryStyle = Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            );

        final child = Material(
          color: background,
          elevation: elevation,
          borderRadius: BorderRadius.circular(999),
          child: Container(
            width: expanded ? double.infinity : null,
            padding: EdgeInsets.symmetric(
              horizontal: compact ? 12 : 16,
              vertical: compact ? 8 : 10,
            ),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              mainAxisSize: expanded ? MainAxisSize.max : MainAxisSize.min,
              mainAxisAlignment:
                  expanded ? MainAxisAlignment.spaceBetween : MainAxisAlignment.start,
              children: [
                Text(current.flag, style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 10),
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(current.nativeName, style: primaryStyle),
                      if (!compact)
                        Text(
                          LanguageService.translate('navigation.language'),
                          style: labelStyle?.copyWith(color: Colors.blueGrey),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Icon(
                  Icons.unfold_more_rounded,
                  size: 20,
                  color: compact ? colorScheme.primary : Colors.blueGrey,
                ),
              ],
            ),
          ),
        );

        return PopupMenuButton<String>(
          tooltip: LanguageService.translate('languageSelector.ariaLabel'),
          initialValue: code,
          onSelected: LanguageService.setLanguage,
          position: PopupMenuPosition.under,
          constraints: const BoxConstraints(minWidth: 220),
          itemBuilder: (context) {
            return options.map((option) {
              final selected = option.code == code;
              return CheckedPopupMenuItem<String>(
                value: option.code,
                checked: selected,
                child: Row(
                  children: [
                    Text(option.flag, style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            option.nativeName,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Text(
                            option.label,
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: Colors.blueGrey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }).toList();
          },
          child: child,
        );
      },
    );
  }
}
