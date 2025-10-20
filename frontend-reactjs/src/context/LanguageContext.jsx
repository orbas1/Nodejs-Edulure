import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const STORAGE_KEY = 'edulure.language';

export const SUPPORTED_LANGUAGES = Object.freeze([
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'fr', label: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr' },
  { code: 'es', label: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr' },
  { code: 'pt', label: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', direction: 'ltr' },
  { code: 'it', label: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', direction: 'ltr' },
  { code: 'pl', label: 'Polish', nativeName: 'Polski', flag: '🇵🇱', direction: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', direction: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  { code: 'de', label: 'German', nativeName: 'Deutsch', flag: '🇩🇪', direction: 'ltr' },
  { code: 'ru', label: 'Russian', nativeName: 'Русский', flag: '🇷🇺', direction: 'ltr' }
]);

const TRANSLATIONS = {
  en: {
    navigation: {
      login: 'Log in',
      register: 'Join the community',
      language: 'Language'
    },
    languageSelector: {
      ariaLabel: 'Change language',
      menuHelp: 'Choose the language you prefer'
    },
    home: {
      hero: {
        headline: 'Where ambitious builders learn, teach, and grow together',
        subhead:
          'Edulure is a community-first home for people obsessed with sharing skills. Swap playbooks, co-host live jams, and turn knowledge into momentum with peers who cheer you on.',
        title: 'Where ambitious builders learn, teach, and grow together',
        description:
          'Edulure is a community-first home for people obsessed with sharing skills. Swap playbooks, co-host live jams, and turn knowledge into momentum with peers who cheer you on.',
        status: 'Built for cohort-based learning',
        ctaPrimary: 'Join the community',
        ctaSecondary: 'Peek inside live circles',
        chips: {
          communities: 'Communities',
          courses: 'Courses',
          ebooks: 'E-books',
          tutors: '1:1 Tutors'
        },
        instructorPill: "I'm an instructor",
        illustrationAlt: 'Collage of instructors and learners collaborating'
      }
    }
  },
  fr: {
    navigation: {
      login: 'Se connecter',
      register: 'Rejoindre la communauté',
      language: 'Langue'
    },
    languageSelector: {
      ariaLabel: 'Changer de langue',
      menuHelp: 'Sélectionnez la langue de votre choix'
    },
    home: {
      hero: {
        headline: 'Là où les bâtisseurs ambitieux apprennent, enseignent et grandissent ensemble',
        subhead:
          'Edulure est un foyer axé sur la communauté pour les personnes obsédées par le partage des compétences. Échangez des playbooks, co-animez des jams en direct et transformez le savoir en élan avec des pairs qui vous encouragent.',
        title: 'Là où les bâtisseurs ambitieux apprennent, enseignent et grandissent ensemble',
        description:
          'Edulure est un foyer axé sur la communauté pour les personnes obsédées par le partage des compétences. Échangez des playbooks, co-animez des jams en direct et transformez le savoir en élan avec des pairs qui vous encouragent.',
        status: "Pensé pour l'apprentissage en cohortes",
        ctaPrimary: 'Rejoindre la communauté',
        ctaSecondary: 'Découvrir les cercles en direct',
        chips: {
          communities: 'Communautés',
          courses: 'Cours',
          ebooks: 'E-books',
          tutors: 'Mentors 1:1'
        },
        instructorPill: 'Je suis instructeur·rice',
        illustrationAlt: "Collage d'instructeurs et d'apprenants en collaboration"
      }
    }
  },
  es: {
    navigation: {
      login: 'Iniciar sesión',
      register: 'Unirse a la comunidad',
      language: 'Idioma'
    },
    languageSelector: {
      ariaLabel: 'Cambiar idioma',
      menuHelp: 'Selecciona el idioma que prefieras'
    },
    home: {
      hero: {
        headline: 'Donde los creadores ambiciosos aprenden, enseñan y crecen juntos',
        subhead:
          'Edulure es un hogar centrado en la comunidad para quienes están obsesionados con compartir habilidades. Intercambia playbooks, coorganiza sesiones en vivo y convierte el conocimiento en impulso con pares que te apoyan.',
        title: 'Donde los creadores ambiciosos aprenden, enseñan y crecen juntos',
        description:
          'Edulure es un hogar centrado en la comunidad para quienes están obsesionados con compartir habilidades. Intercambia playbooks, coorganiza sesiones en vivo y convierte el conocimiento en impulso con pares que te apoyan.',
        status: 'Diseñado para el aprendizaje por cohortes',
        ctaPrimary: 'Unirse a la comunidad',
        ctaSecondary: 'Explorar círculos en vivo',
        chips: {
          communities: 'Comunidades',
          courses: 'Cursos',
          ebooks: 'E-books',
          tutors: 'Mentores 1:1'
        },
        instructorPill: 'Soy instructor/a',
        illustrationAlt: 'Collage de instructores y estudiantes colaborando'
      }
    }
  },
  pt: {
    navigation: {
      login: 'Entrar',
      register: 'Juntar-se à comunidade',
      language: 'Idioma'
    },
    languageSelector: {
      ariaLabel: 'Alterar idioma',
      menuHelp: 'Escolha o idioma que preferir'
    },
    home: {
      hero: {
        headline: 'Onde construtores ambiciosos aprendem, ensinam e crescem juntos',
        subhead:
          'Edulure é um lar focado na comunidade para quem é apaixonado por compartilhar habilidades. Troque playbooks, co-organize sessões ao vivo e transforme conhecimento em impulso com pares que torcem por você.',
        title: 'Onde construtores ambiciosos aprendem, ensinam e crescem juntos',
        description:
          'Edulure é um lar focado na comunidade para quem é apaixonado por compartilhar habilidades. Troque playbooks, co-organize sessões ao vivo e transforme conhecimento em impulso com pares que torcem por você.',
        status: 'Feito para aprendizagem em cohortes',
        ctaPrimary: 'Juntar-se à comunidade',
        ctaSecondary: 'Ver círculos ao vivo',
        chips: {
          communities: 'Comunidades',
          courses: 'Cursos',
          ebooks: 'E-books',
          tutors: 'Mentores 1:1'
        },
        instructorPill: 'Sou instrutor(a)',
        illustrationAlt: 'Colagem de instrutores e aprendizes colaborando'
      }
    }
  },
  it: {
    navigation: {
      login: 'Accedi',
      register: 'Unisciti alla comunità',
      language: 'Lingua'
    },
    languageSelector: {
      ariaLabel: 'Cambia lingua',
      menuHelp: 'Seleziona la lingua preferita'
    },
    home: {
      hero: {
        headline: 'Dove i builder ambiziosi imparano, insegnano e crescono insieme',
        subhead:
          'Edulure è una casa incentrata sulla comunità per chi è ossessionato dal condividere competenze. Scambia playbook, co-organizza sessioni live e trasforma il sapere in slancio con pari che ti sostengono.',
        title: 'Dove i builder ambiziosi imparano, insegnano e crescono insieme',
        description:
          'Edulure è una casa incentrata sulla comunità per chi è ossessionato dal condividere competenze. Scambia playbook, co-organizza sessioni live e trasforma il sapere in slancio con pari che ti sostengono.',
        status: "Pensato per l'apprendimento in coorte",
        ctaPrimary: 'Unisciti alla comunità',
        ctaSecondary: "Dai un'occhiata ai circle live",
        chips: {
          communities: 'Comunità',
          courses: 'Corsi',
          ebooks: 'E-book',
          tutors: 'Tutor 1:1'
        },
        instructorPill: 'Sono un* istruttore/trice',
        illustrationAlt: 'Collage di istruttori e studenti che collaborano'
      }
    }
  },
  pl: {
    navigation: {
      login: 'Zaloguj się',
      register: 'Dołącz do społeczności',
      language: 'Język'
    },
    languageSelector: {
      ariaLabel: 'Zmień język',
      menuHelp: 'Wybierz preferowany język'
    },
    home: {
      hero: {
        headline: 'Miejsce, w którym ambitni twórcy uczą się, uczą innych i rosną razem',
        subhead:
          'Edulure to społecznościowy dom dla osób, które kochają dzielić się umiejętnościami. Wymieniaj się playbookami, współprowadź sesje na żywo i zamieniaj wiedzę w rozpęd z partnerami, którzy Ci kibicują.',
        title: 'Miejsce, w którym ambitni twórcy uczą się, uczą innych i rosną razem',
        description:
          'Edulure to społecznościowy dom dla osób, które kochają dzielić się umiejętnościami. Wymieniaj się playbookami, współprowadź sesje na żywo i zamieniaj wiedzę w rozpęd z partnerami, którzy Ci kibicują.',
        status: 'Stworzone dla nauki w kohortach',
        ctaPrimary: 'Dołącz do społeczności',
        ctaSecondary: 'Zajrzyj do aktywnych kręgów',
        chips: {
          communities: 'Społeczności',
          courses: 'Kursy',
          ebooks: 'E-booki',
          tutors: 'Tutorzy 1:1'
        },
        instructorPill: 'Jestem instruktorem',
        illustrationAlt: 'Kolaż instruktorów i uczniów współpracujących ze sobą'
      }
    }
  },
  hi: {
    navigation: {
      login: 'लॉग इन करें',
      register: 'समुदाय से जुड़ें',
      language: 'भाषा'
    },
    languageSelector: {
      ariaLabel: 'भाषा बदलें',
      menuHelp: 'अपनी पसंदीदा भाषा चुनें'
    },
    home: {
      hero: {
        headline: 'जहाँ महत्वाकांक्षी निर्माता एक साथ सीखते, सिखाते और बढ़ते हैं',
        subhead:
          'एड्यूलर उन लोगों का समुदाय-केंद्रित घर है जो कौशल साझा करने के प्रति उत्साही हैं। प्लेबुक्स का आदान-प्रदान करें, लाइव सत्र सह-होस्ट करें, और ऐसे साथियों के साथ ज्ञान को गति में बदलें जो आपका उत्साह बढ़ाते हैं।',
        title: 'जहाँ महत्वाकांक्षी निर्माता एक साथ सीखते, सिखाते और बढ़ते हैं',
        description:
          'एड्यूलर उन लोगों का समुदाय-केंद्रित घर है जो कौशल साझा करने के प्रति उत्साही हैं। प्लेबुक्स का आदान-प्रदान करें, लाइव सत्र सह-होस्ट करें, और ऐसे साथियों के साथ ज्ञान को गति में बदलें जो आपका उत्साह बढ़ाते हैं।',
        status: 'कोहोर्ट आधारित सीखने के लिए बनाया गया',
        ctaPrimary: 'समुदाय से जुड़ें',
        ctaSecondary: 'लाइव सर्कल देखें',
        chips: {
          communities: 'समुदाय',
          courses: 'पाठ्यक्रम',
          ebooks: 'ई-पुस्तकें',
          tutors: '1:1 ट्यूटर'
        },
        instructorPill: 'मैं प्रशिक्षक हूँ',
        illustrationAlt: 'प्रशिक्षकों और शिक्षार्थियों के सहयोग का कोलाज'
      }
    }
  },
  ar: {
    navigation: {
      login: 'تسجيل الدخول',
      register: 'انضم إلى المجتمع',
      language: 'اللغة'
    },
    languageSelector: {
      ariaLabel: 'تغيير اللغة',
      menuHelp: 'اختر لغتك المفضلة'
    },
    home: {
      hero: {
        headline: 'حيث يتعلم البناة الطموحون ويعلّمون وينمون معًا',
        subhead:
          'إدولور هو موطن يرتكز على المجتمع للأشخاص الشغوفين بمشاركة المهارات. تبادل الخطط، واستضف الجلسات المباشرة معًا، وحوّل المعرفة إلى زخم مع أقران يشجعونك.',
        title: 'حيث يتعلم البناة الطموحون ويعلّمون وينمون معًا',
        description:
          'إدولور هو موطن يرتكز على المجتمع للأشخاص الشغوفين بمشاركة المهارات. تبادل الخطط، واستضف الجلسات المباشرة معًا، وحوّل المعرفة إلى زخم مع أقران يشجعونك.',
        status: 'مصمم للتعلم القائم على الدُفعات',
        ctaPrimary: 'انضم إلى المجتمع',
        ctaSecondary: 'استكشف الحلقات المباشرة',
        chips: {
          communities: 'المجتمعات',
          courses: 'الدورات',
          ebooks: 'الكتب الإلكترونية',
          tutors: 'مدرّسون فرديون'
        },
        instructorPill: 'أنا مدرّس/ة',
        illustrationAlt: 'مجموعة صور لمدربين ومتعلّمين يتعاونون'
      }
    }
  },
  de: {
    navigation: {
      login: 'Anmelden',
      register: 'Der Community beitreten',
      language: 'Sprache'
    },
    languageSelector: {
      ariaLabel: 'Sprache ändern',
      menuHelp: 'Wähle deine bevorzugte Sprache'
    },
    home: {
      hero: {
        headline: 'Wo ambitionierte Builder gemeinsam lernen, lehren und wachsen',
        subhead:
          'Edulure ist ein communityorientiertes Zuhause für Menschen, die leidenschaftlich gerne Fähigkeiten teilen. Tausche Playbooks, veranstalte gemeinsam Live-Sessions und verwandle Wissen in Schwung mit Gleichgesinnten, die dich anfeuern.',
        title: 'Wo ambitionierte Builder gemeinsam lernen, lehren und wachsen',
        description:
          'Edulure ist ein communityorientiertes Zuhause für Menschen, die leidenschaftlich gerne Fähigkeiten teilen. Tausche Playbooks, veranstalte gemeinsam Live-Sessions und verwandle Wissen in Schwung mit Gleichgesinnten, die dich anfeuern.',
        status: 'Gemacht für kohortenbasiertes Lernen',
        ctaPrimary: 'Der Community beitreten',
        ctaSecondary: 'Live-Circles entdecken',
        chips: {
          communities: 'Communities',
          courses: 'Kurse',
          ebooks: 'E-Books',
          tutors: '1:1 Tutor:innen'
        },
        instructorPill: 'Ich bin Trainer:in',
        illustrationAlt: 'Collage aus Lehrenden und Lernenden, die zusammenarbeiten'
      }
    }
  },
  ru: {
    navigation: {
      login: 'Войти',
      register: 'Присоединиться к сообществу',
      language: 'Язык'
    },
    languageSelector: {
      ariaLabel: 'Изменить язык',
      menuHelp: 'Выберите предпочитаемый язык'
    },
    home: {
      hero: {
        headline: 'Где амбициозные создатели учатся, делятся опытом и растут вместе',
        subhead:
          'Edulure — это пространство, ориентированное на сообщество, для людей, которые любят делиться навыками. Обменивайтесь методиками, проводите совместные прямые сессии и превращайте знания в движение с поддержкой единомышленников.',
        title: 'Где амбициозные создатели учатся, делятся опытом и растут вместе',
        description:
          'Edulure — это пространство, ориентированное на сообщество, для людей, которые любят делиться навыками. Обменивайтесь методиками, проводите совместные прямые сессии и превращайте знания в движение с поддержкой единомышленников.',
        status: 'Создано для обучения в когортах',
        ctaPrimary: 'Присоединиться к сообществу',
        ctaSecondary: 'Заглянуть в активные круги',
        chips: {
          communities: 'Сообщества',
          courses: 'Курсы',
          ebooks: 'Электронные книги',
          tutors: 'Наставники 1:1'
        },
        instructorPill: 'Я преподаватель',
        illustrationAlt: 'Коллаж из инструкторов и учащихся, работающих вместе'
      }
    }
  }
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  languages: SUPPORTED_LANGUAGES,
  t: (key, fallback) => fallback ?? key
});

const resolveInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.some((lang) => lang.code === stored)) {
    return stored;
  }

  const navigatorLanguages = Array.isArray(window.navigator.languages)
    ? window.navigator.languages
    : [window.navigator.language ?? 'en'];

  for (const locale of navigatorLanguages) {
    if (!locale) continue;
    const languageCode = locale.toLowerCase().split('-')[0];
    const match = SUPPORTED_LANGUAGES.find((lang) => lang.code === languageCode);
    if (match) {
      return match.code;
    }
  }

  return 'en';
};

const resolveTranslation = (languageCode, key) => {
  const path = key.split('.');
  let current = TRANSLATIONS[languageCode];

  for (const segment of path) {
    if (current && Object.prototype.hasOwnProperty.call(current, segment)) {
      current = current[segment];
    } else {
      current = undefined;
      break;
    }
  }

  return typeof current === 'string' ? current : undefined;
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => resolveInitialLanguage());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      const resolved = SUPPORTED_LANGUAGES.find((lang) => lang.code === language);
      document.documentElement.dir = resolved?.direction === 'rtl' ? 'rtl' : 'ltr';
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const setLanguage = useCallback((code) => {
    const target = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
    if (!target) return;
    setLanguageState(target.code);
  }, []);

  const translate = useCallback(
    (key, fallback) => {
      const current = resolveTranslation(language, key);
      if (current) {
        return current;
      }
      const defaultTranslation = resolveTranslation('en', key);
      if (defaultTranslation) {
        return defaultTranslation;
      }
      return fallback ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      languages: SUPPORTED_LANGUAGES,
      setLanguage,
      t: translate
    }),
    [language, setLanguage, translate]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslate() {
  const { t } = useLanguage();
  return t;
}

export default LanguageContext;
