import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

class LanguageOption {
  const LanguageOption({
    required this.code,
    required this.label,
    required this.nativeName,
    required this.flag,
    this.direction = TextDirection.ltr,
  });

  final String code;
  final String label;
  final String nativeName;
  final String flag;
  final TextDirection direction;
}

class LanguageService {
  LanguageService._();

  static const _boxName = 'language.preferences';
  static const _selectedKey = 'selected_language';

  static const LanguageOption _defaultOption = LanguageOption(
    code: 'en',
    label: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  );

  static const List<LanguageOption> options = [
    _defaultOption,
    LanguageOption(code: 'fr', label: 'French', nativeName: 'Français', flag: '🇫🇷'),
    LanguageOption(code: 'es', label: 'Spanish', nativeName: 'Español', flag: '🇪🇸'),
    LanguageOption(code: 'pt', label: 'Portuguese', nativeName: 'Português', flag: '🇵🇹'),
    LanguageOption(code: 'it', label: 'Italian', nativeName: 'Italiano', flag: '🇮🇹'),
    LanguageOption(code: 'pl', label: 'Polish', nativeName: 'Polski', flag: '🇵🇱'),
    LanguageOption(code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳'),
    LanguageOption(code: 'ar', label: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: TextDirection.rtl),
    LanguageOption(code: 'de', label: 'German', nativeName: 'Deutsch', flag: '🇩🇪'),
    LanguageOption(code: 'ru', label: 'Russian', nativeName: 'Русский', flag: '🇷🇺'),
  ];

  static final ValueNotifier<String> _languageNotifier =
      ValueNotifier<String>(_defaultOption.code);

  static const Map<String, Map<String, dynamic>> _translations = {
    'en': {
      'navigation': {
        'login': 'Log in',
        'register': 'Join the community',
        'language': 'Language',
      },
      'languageSelector': {
        'ariaLabel': 'Change language',
        'menuHelp': 'Choose the language you prefer',
      },
      'home': {
        'hero': {
          'title': 'Where ambitious builders learn, teach, and grow together',
          'description':
              'Edulure is a community-first home for people obsessed with sharing skills. Swap playbooks, co-host live jams, and turn knowledge into momentum with peers who cheer you on.',
          'ctaPrimary': 'Join the community',
          'ctaSecondary': 'Peek inside live circles',
        },
      },
    },
    'fr': {
      'navigation': {
        'login': 'Se connecter',
        'register': 'Rejoindre la communauté',
        'language': 'Langue',
      },
      'languageSelector': {
        'ariaLabel': 'Changer de langue',
        'menuHelp': 'Sélectionnez la langue de votre choix',
      },
      'home': {
        'hero': {
          'title': 'Là où les bâtisseurs ambitieux apprennent, enseignent et grandissent ensemble',
          'description':
              'Edulure est un foyer axé sur la communauté pour les personnes obsédées par le partage des compétences. Échangez des playbooks, co-animez des jams en direct et transformez le savoir en élan avec des pairs qui vous encouragent.',
          'ctaPrimary': 'Rejoindre la communauté',
          'ctaSecondary': 'Découvrir les cercles en direct',
        },
      },
    },
    'es': {
      'navigation': {
        'login': 'Iniciar sesión',
        'register': 'Unirse a la comunidad',
        'language': 'Idioma',
      },
      'languageSelector': {
        'ariaLabel': 'Cambiar idioma',
        'menuHelp': 'Selecciona el idioma que prefieras',
      },
      'home': {
        'hero': {
          'title': 'Donde los creadores ambiciosos aprenden, enseñan y crecen juntos',
          'description':
              'Edulure es un hogar centrado en la comunidad para quienes están obsesionados con compartir habilidades. Intercambia playbooks, coorganiza sesiones en vivo y convierte el conocimiento en impulso con pares que te apoyan.',
          'ctaPrimary': 'Unirse a la comunidad',
          'ctaSecondary': 'Explorar círculos en vivo',
        },
      },
    },
    'pt': {
      'navigation': {
        'login': 'Entrar',
        'register': 'Juntar-se à comunidade',
        'language': 'Idioma',
      },
      'languageSelector': {
        'ariaLabel': 'Alterar idioma',
        'menuHelp': 'Escolha o idioma que preferir',
      },
      'home': {
        'hero': {
          'title': 'Onde construtores ambiciosos aprendem, ensinam e crescem juntos',
          'description':
              'Edulure é um lar focado na comunidade para quem é apaixonado por compartilhar habilidades. Troque playbooks, co-organize sessões ao vivo e transforme conhecimento em impulso com pares que torcem por você.',
          'ctaPrimary': 'Juntar-se à comunidade',
          'ctaSecondary': 'Ver círculos ao vivo',
        },
      },
    },
    'it': {
      'navigation': {
        'login': 'Accedi',
        'register': 'Unisciti alla comunità',
        'language': 'Lingua',
      },
      'languageSelector': {
        'ariaLabel': 'Cambia lingua',
        'menuHelp': 'Seleziona la lingua preferita',
      },
      'home': {
        'hero': {
          'title': 'Dove i builder ambiziosi imparano, insegnano e crescono insieme',
          'description':
              'Edulure è una casa incentrata sulla comunità per chi è ossessionato dal condividere competenze. Scambia playbook, co-organizza sessioni live e trasforma il sapere in slancio con pari che ti sostengono.',
          'ctaPrimary': 'Unisciti alla comunità',
          'ctaSecondary': "Dai un'occhiata ai circle live",
        },
      },
    },
    'pl': {
      'navigation': {
        'login': 'Zaloguj się',
        'register': 'Dołącz do społeczności',
        'language': 'Język',
      },
      'languageSelector': {
        'ariaLabel': 'Zmień język',
        'menuHelp': 'Wybierz preferowany język',
      },
      'home': {
        'hero': {
          'title': 'Miejsce, w którym ambitni twórcy uczą się, uczą innych i rosną razem',
          'description':
              'Edulure to społecznościowy dom dla osób, które kochają dzielić się umiejętnościami. Wymieniaj się playbookami, współprowadzisz sesje na żywo i zamieniaj wiedzę w rozpęd z partnerami, którzy Ci kibicują.',
          'ctaPrimary': 'Dołącz do społeczności',
          'ctaSecondary': 'Zajrzyj do aktywnych kręgów',
        },
      },
    },
    'hi': {
      'navigation': {
        'login': 'लॉग इन करें',
        'register': 'समुदाय से जुड़ें',
        'language': 'भाषा',
      },
      'languageSelector': {
        'ariaLabel': 'भाषा बदलें',
        'menuHelp': 'अपनी पसंदीदा भाषा चुनें',
      },
      'home': {
        'hero': {
          'title': 'जहाँ महत्वाकांक्षी निर्माता एक साथ सीखते, सिखाते और बढ़ते हैं',
          'description':
              'एड्यूलर उन लोगों का समुदाय-केंद्रित घर है जो कौशल साझा करने के प्रति उत्साही हैं। प्लेबुक्स का आदान-प्रदान करें, लाइव सत्र सह-होस्ट करें, और ऐसे साथियों के साथ ज्ञान को गति में बदलें जो आपका उत्साह बढ़ाते हैं।',
          'ctaPrimary': 'समुदाय से जुड़ें',
          'ctaSecondary': 'लाइव सर्कल देखें',
        },
      },
    },
    'ar': {
      'navigation': {
        'login': 'تسجيل الدخول',
        'register': 'انضم إلى المجتمع',
        'language': 'اللغة',
      },
      'languageSelector': {
        'ariaLabel': 'تغيير اللغة',
        'menuHelp': 'اختر لغتك المفضلة',
      },
      'home': {
        'hero': {
          'title': 'حيث يتعلم البناة الطموحون ويعلّمون وينمون معًا',
          'description':
              'إدولور هو موطن يرتكز على المجتمع للأشخاص الشغوفين بمشاركة المهارات. تبادل الخطط، واستضف الجلسات المباشرة معًا، وحوّل المعرفة إلى زخم مع أقران يشجعونك.',
          'ctaPrimary': 'انضم إلى المجتمع',
          'ctaSecondary': 'استكشف الحلقات المباشرة',
        },
      },
    },
    'de': {
      'navigation': {
        'login': 'Anmelden',
        'register': 'Der Community beitreten',
        'language': 'Sprache',
      },
      'languageSelector': {
        'ariaLabel': 'Sprache ändern',
        'menuHelp': 'Wähle deine bevorzugte Sprache',
      },
      'home': {
        'hero': {
          'title': 'Wo ambitionierte Builder gemeinsam lernen, lehren und wachsen',
          'description':
              'Edulure ist ein communityorientiertes Zuhause für Menschen, die leidenschaftlich gerne Fähigkeiten teilen. Tausche Playbooks, veranstalte gemeinsam Live-Sessions und verwandle Wissen in Schwung mit Gleichgesinnten, die dich anfeuern.',
          'ctaPrimary': 'Der Community beitreten',
          'ctaSecondary': 'Live-Circles entdecken',
        },
      },
    },
    'ru': {
      'navigation': {
        'login': 'Войти',
        'register': 'Присоединиться к сообществу',
        'language': 'Язык',
      },
      'languageSelector': {
        'ariaLabel': 'Изменить язык',
        'menuHelp': 'Выберите предпочитаемый язык',
      },
      'home': {
        'hero': {
          'title': 'Где амбициозные создатели учатся, делятся опытом и растут вместе',
          'description':
              'Edulure — это пространство, ориентированное на сообщество, для людей, которые любят делиться навыками. Обменивайтесь методиками, проводите совместные прямые сессии и превращайте знания в движение с поддержкой единомышленников.',
          'ctaPrimary': 'Присоединиться к сообществу',
          'ctaSecondary': 'Заглянуть в активные круги',
        },
      },
    },
  };

  static Future<void> init() async {
    if (!Hive.isBoxOpen(_boxName)) {
      await Hive.openBox(_boxName);
    }
    final box = Hive.box(_boxName);
    final stored = box.get(_selectedKey);
    if (stored is String && _isSupported(stored)) {
      _languageNotifier.value = stored;
    } else {
      _languageNotifier.value = _matchSystemLocale();
    }
  }

  static Future<void> setLanguage(String code) async {
    if (!_isSupported(code)) return;
    _languageNotifier.value = code;
    final box = Hive.box(_boxName);
    await box.put(_selectedKey, code);
  }

  static ValueListenable<String> listenable() => _languageNotifier;

  static LanguageOption get currentOption =>
      options.firstWhere((option) => option.code == _languageNotifier.value,
          orElse: () => _defaultOption);

  static Locale get currentLocale => Locale(_languageNotifier.value);

  static List<Locale> get supportedLocales =>
      options.map((option) => Locale(option.code)).toList();

  static String translate(String key) {
    final resolved = _resolve(_translations[_languageNotifier.value], key);
    if (resolved is String) {
      return resolved;
    }
    final fallback = _resolve(_translations[_defaultOption.code], key);
    return fallback is String ? fallback : key;
  }

  static bool _isSupported(String code) =>
      options.any((option) => option.code == code);

  static String _matchSystemLocale() {
    final dispatcher = WidgetsBinding.instance.platformDispatcher;
    final locales = dispatcher.locales;
    for (final locale in locales) {
      final code = locale.languageCode.toLowerCase();
      if (_isSupported(code)) {
        return code;
      }
    }
    final primary = dispatcher.locale.languageCode.toLowerCase();
    if (_isSupported(primary)) {
      return primary;
    }
    return _defaultOption.code;
  }

  static dynamic _resolve(Map<String, dynamic>? source, String key) {
    if (source == null) return null;
    final segments = key.split('.');
    dynamic current = source;
    for (final segment in segments) {
      if (current is Map<String, dynamic> && current.containsKey(segment)) {
        current = current[segment];
      } else {
        return null;
      }
    }
    return current;
  }
}
