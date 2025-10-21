import 'package:edulure_mobile/widgets/language_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Widget _buildSubject({bool compact = false, bool expanded = false}) {
    return MaterialApp(
      home: Scaffold(
        body: Center(
          child: LanguageSelector(
            compact: compact,
            expanded: expanded,
          ),
        ),
      ),
    );
  }

  testWidgets('renders the current language with helper label', (tester) async {
    await tester.pumpWidget(_buildSubject());

    expect(find.text('English'), findsOneWidget);
    expect(find.textContaining('Language'), findsOneWidget);
    expect(find.text('🇺🇸'), findsOneWidget);

    final popup = tester.widget<PopupMenuButton<String>>(find.byType(PopupMenuButton<String>));
    expect(popup.enabled, isTrue);
  });

  testWidgets('shows translated helper text when the menu opens', (tester) async {
    await tester.pumpWidget(_buildSubject());

    await tester.tap(find.byType(PopupMenuButton<String>));
    await tester.pumpAndSettle();

    expect(find.text('Choose the language you prefer'), findsOneWidget);
    expect(find.text('Français'), findsOneWidget);
    expect(find.text('Español'), findsOneWidget);
  });

  testWidgets('supports compact layout without losing affordances', (tester) async {
    await tester.pumpWidget(_buildSubject(compact: true));

    expect(find.text('English'), findsOneWidget);
    expect(find.textContaining('Language'), findsNothing);
    expect(find.byIcon(Icons.unfold_more_rounded), findsOneWidget);
  });
}
