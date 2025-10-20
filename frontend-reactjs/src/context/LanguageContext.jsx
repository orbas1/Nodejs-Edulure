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
        cards: {
          liveSession: {
            title: 'Live cohort jam',
            meta: 'Starts in 12 hours',
            cta: 'Set reminder'
          },
          community: {
            title: 'Community pulse',
            status: 'Live now',
            headline: 'Weekly build circle',
            subhead: 'Swap launches, feedback, and wins with peers'
          },
          resource: {
            title: 'Creator tea digest',
            meta: 'Fresh drops every Monday',
            cta: 'Read now'
          }
        },
        instructorPill: "I'm an instructor",
        illustrationAlt: 'Collage of instructors and learners collaborating'
      },
      tutoring: {
        kicker: 'Tutor arcade',
        headline: 'Queue up your next breakthrough session',
        subhead:
          'Spin up on-demand mentors, drop goals into the queue, and leave every call with a power-up tailored to your momentum.',
        ctaPrimary: 'Explore the tutor arcade',
        ctaSecondary: 'Book a lightning session',
        calendar: {
          status: 'Live queue',
          next: 'Next refresh in 00:30',
          title: 'Arcade queue',
          slots: {
            focus: {
              title: 'Focus sprint · UX critique',
              meta: '12 min • Rina (Product mentor)'
            },
            strategy: {
              title: 'Strategy boost · Launch runway',
              meta: '28 min • Malik (Growth coach)'
            },
            clarity: {
              title: 'Clarity check · Data storytelling',
              meta: '45 min • Zia (Analytics guide)'
            }
          },
          footnote: 'Auto-matching refreshes every 30 seconds to keep energy high.'
        },
        learner: {
          title: 'Learner power-ups',
          items: {
            0: 'Drop micro-goals and get laser feedback without waitlists.',
            1: 'Unlock curated practice quests after every session.',
            2: 'Sync notes and replays straight into your Edulure workspace.'
          }
        },
        instructor: {
          title: 'Instructor power-ups',
          items: {
            0: 'Fill idle blocks with learners already primed for your craft.',
            1: 'Launch reusable session templates with one neon tap.',
            2: 'Earn spotlight boosts when five-star reviews roll in fast.'
          }
        }
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
        cards: {
          liveSession: {
            title: 'Session de cohorte en direct',
            meta: 'Commence dans 12 heures',
            cta: 'Définir un rappel'
          },
          community: {
            title: 'Pouls de la communauté',
            status: 'En direct',
            headline: 'Cercle hebdomadaire de création',
            subhead: 'Partagez lancements, retours et succès entre pairs'
          },
          resource: {
            title: 'Digest des créateurs',
            meta: 'Nouveautés chaque lundi',
            cta: 'Lire maintenant'
          }
        },
        instructorPill: 'Je suis instructeur·rice',
        illustrationAlt: "Collage d'instructeurs et d'apprenants en collaboration"
      },
      tutoring: {
        kicker: 'Arcade des tuteurs',
        headline: 'Alignez votre prochaine session décisive',
        subhead:
          'Activez des mentors à la demande, déposez vos objectifs dans la file et repartez de chaque appel avec un bonus calibré sur votre momentum.',
        ctaPrimary: 'Explorer l’arcade des tuteurs',
        ctaSecondary: 'Réserver une session éclair',
        calendar: {
          status: 'File en direct',
          next: 'Prochaine mise à jour dans 00:30',
          title: 'File arcade',
          slots: {
            focus: {
              title: 'Sprint focus · Critique UX',
              meta: '12 min • Rina (mentor produit)'
            },
            strategy: {
              title: 'Boost stratégie · Piste de lancement',
              meta: '28 min • Malik (coach croissance)'
            },
            clarity: {
              title: 'Contrôle clarté · Storytelling data',
              meta: '45 min • Zia (guide analytique)'
            }
          },
          footnote: 'L’auto-appairage se régénère toutes les 30 secondes pour garder le rythme.'
        },
        learner: {
          title: 'Power-ups apprenant·e',
          items: {
            0: 'Déposez des micro-objectifs et recevez un feedback laser sans liste d’attente.',
            1: 'Débloquez des quêtes de pratique personnalisées après chaque session.',
            2: 'Synchronisez notes et replays directement dans votre espace Edulure.'
          }
        },
        instructor: {
          title: 'Power-ups instructeur·rice',
          items: {
            0: 'Remplissez vos créneaux libres avec des apprenant·e·s aligné·e·s sur votre expertise.',
            1: 'Déployez des modèles de session réutilisables en un tap néon.',
            2: 'Gagnez des boosts de visibilité quand les avis cinq étoiles s’enchaînent.'
          }
        }
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
        cards: {
          liveSession: {
            title: 'Sesión de cohorte en vivo',
            meta: 'Comienza en 12 horas',
            cta: 'Crear recordatorio'
          },
          community: {
            title: 'Pulso de la comunidad',
            status: 'En vivo',
            headline: 'Círculo semanal de creación',
            subhead: 'Comparte lanzamientos, feedback y logros con pares'
          },
          resource: {
            title: 'Digest de creador/a',
            meta: 'Novedades cada lunes',
            cta: 'Leer ahora'
          }
        },
        instructorPill: 'Soy instructor/a',
        illustrationAlt: 'Collage de instructores y estudiantes colaborando'
      },
      tutoring: {
        kicker: 'Arcade de tutores',
        headline: 'Enfila tu próxima sesión decisiva',
        subhead:
          'Activa mentores bajo demanda, deja tus metas en la cola y sal de cada llamada con un power-up hecho a tu medida.',
        ctaPrimary: 'Explorar el arcade de tutores',
        ctaSecondary: 'Reservar sesión relámpago',
        calendar: {
          status: 'Fila en vivo',
          next: 'Próxima actualización en 00:30',
          title: 'Fila arcade',
          slots: {
            focus: {
              title: 'Sprint focus · Crítica UX',
              meta: '12 min • Rina (mentora de producto)'
            },
            strategy: {
              title: 'Impulso estrategia · Pista de lanzamiento',
              meta: '28 min • Malik (coach de crecimiento)'
            },
            clarity: {
              title: 'Chequeo claridad · Storytelling de datos',
              meta: '45 min • Zia (guía analítica)'
            }
          },
          footnote: 'El auto-matching se renueva cada 30 segundos para mantener la energía.'
        },
        learner: {
          title: 'Power-ups de estudiantes',
          items: {
            0: 'Deja micro objetivos y recibe feedback láser sin listas de espera.',
            1: 'Desbloquea misiones de práctica curadas tras cada sesión.',
            2: 'Sincroniza notas y grabaciones directo en tu espacio Edulure.'
          }
        },
        instructor: {
          title: 'Power-ups de instructores',
          items: {
            0: 'Llena huecos libres con estudiantes alineados a tu expertise.',
            1: 'Lanza plantillas de sesión reutilizables con un toque neón.',
            2: 'Gana impulsos de visibilidad cuando llueven reseñas de cinco estrellas.'
          }
        }
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
        cards: {
          liveSession: {
            title: 'Sessão de coorte ao vivo',
            meta: 'Começa em 12 horas',
            cta: 'Criar lembrete'
          },
          community: {
            title: 'Pulso da comunidade',
            status: 'Ao vivo agora',
            headline: 'Círculo semanal de construção',
            subhead: 'Compartilhe lançamentos, feedbacks e conquistas com os pares'
          },
          resource: {
            title: 'Digest do criador',
            meta: 'Novidades toda segunda-feira',
            cta: 'Ler agora'
          }
        },
        instructorPill: 'Sou instrutor(a)',
        illustrationAlt: 'Colagem de instrutores e aprendizes colaborando'
      },
      tutoring: {
        kicker: 'Arcade de tutores',
        headline: 'Fila sua próxima sessão decisiva',
        subhead:
          'Ative mentores sob demanda, solte metas na fila e saia de cada chamada com um power-up feito para o seu ritmo.',
        ctaPrimary: 'Explorar o arcade de tutores',
        ctaSecondary: 'Agendar sessão relâmpago',
        calendar: {
          status: 'Fila ao vivo',
          next: 'Próxima atualização em 00:30',
          title: 'Fila arcade',
          slots: {
            focus: {
              title: 'Sprint de foco · Crítica UX',
              meta: '12 min • Rina (mentora de produto)'
            },
            strategy: {
              title: 'Impulso de estratégia · Pista de lançamento',
              meta: '28 min • Malik (coach de crescimento)'
            },
            clarity: {
              title: 'Checagem de clareza · Storytelling de dados',
              meta: '45 min • Zia (guia analítica)'
            }
          },
          footnote: 'O pareamento automático se renova a cada 30 segundos para manter a energia alta.'
        },
        learner: {
          title: 'Power-ups para aprendizes',
          items: {
            0: 'Solte micro metas e receba feedback cirúrgico sem filas de espera.',
            1: 'Desbloqueie missões de prática curadas após cada sessão.',
            2: 'Sincronize notas e gravações direto para o seu espaço Edulure.'
          }
        },
        instructor: {
          title: 'Power-ups para instrutores',
          items: {
            0: 'Preencha janelas livres com aprendizes prontos para o seu ofício.',
            1: 'Dispare modelos reutilizáveis de sessão com um toque neon.',
            2: 'Ganhe boosts de destaque quando as avaliações cinco estrelas chegarem rápido.'
          }
        }
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
        cards: {
          liveSession: {
            title: 'Sessione di coorte live',
            meta: 'Inizia tra 12 ore',
            cta: 'Imposta promemoria'
          },
          community: {
            title: 'Bussola della community',
            status: 'Live ora',
            headline: 'Cerchio di build settimanale',
            subhead: 'Condividi lanci, feedback e successi con i pari'
          },
          resource: {
            title: 'Digest del creator',
            meta: 'Nuove uscite ogni lunedì',
            cta: 'Leggi ora'
          }
        },
        instructorPill: 'Sono un* istruttore/trice',
        illustrationAlt: 'Collage di istruttori e studenti che collaborano'
      },
      tutoring: {
        kicker: 'Arcade tutor',
        headline: 'Metti in coda la tua prossima sessione di svolta',
        subhead:
          'Attiva mentor on demand, lascia gli obiettivi in coda e chiudi ogni call con un power-up calibrato sul tuo slancio.',
        ctaPrimary: "Esplora l'arcade dei tutor",
        ctaSecondary: 'Prenota una sessione lampo',
        calendar: {
          status: 'Coda live',
          next: 'Prossimo refresh in 00:30',
          title: 'Coda arcade',
          slots: {
            focus: {
              title: 'Sprint focus · Critica UX',
              meta: '12 min • Rina (mentor di prodotto)'
            },
            strategy: {
              title: 'Boost strategia · Pista di lancio',
              meta: '28 min • Malik (coach crescita)'
            },
            clarity: {
              title: 'Check chiarezza · Data storytelling',
              meta: '45 min • Zia (guida analytics)'
            }
          },
          footnote: "Il matching automatico si aggiorna ogni 30 secondi per tenere alta l'energia."
        },
        learner: {
          title: 'Power-up per chi apprende',
          items: {
            0: 'Lascia micro-obiettivi e ricevi feedback laser senza liste d’attesa.',
            1: 'Sblocca missioni di pratica curate dopo ogni sessione.',
            2: 'Sincronizza note e replay direttamente nel tuo workspace Edulure.'
          }
        },
        instructor: {
          title: 'Power-up per chi insegna',
          items: {
            0: 'Riempi gli slot liberi con learner già allineati al tuo mestiere.',
            1: 'Lancia template riutilizzabili di sessione con un tap neon.',
            2: 'Ottieni boost di visibilità quando arrivano recensioni a cinque stelle a ritmo serrato.'
          }
        }
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
        cards: {
          liveSession: {
            title: 'Sesja kohorty na żywo',
            meta: 'Start za 12 godzin',
            cta: 'Ustaw przypomnienie'
          },
          community: {
            title: 'Puls społeczności',
            status: 'Na żywo',
            headline: 'Cotygodniowy krąg twórców',
            subhead: 'Dzielenie się premierami, feedbackiem i sukcesami z innymi'
          },
          resource: {
            title: 'Digest twórców',
            meta: 'Nowości w każdy poniedziałek',
            cta: 'Czytaj teraz'
          }
        },
        instructorPill: 'Jestem instruktorem',
        illustrationAlt: 'Kolaż instruktorów i uczniów współpracujących ze sobą'
      },
      tutoring: {
        kicker: 'Arcade tutorów',
        headline: 'Ustaw w kolejce swoją następną przełomową sesję',
        subhead:
          'Aktywuj mentorów na żądanie, wrzuć cele do kolejki i zakończ każde połączenie z power-upem dopasowanym do twojego tempa.',
        ctaPrimary: 'Poznaj arcade tutorów',
        ctaSecondary: 'Rezerwuj błyskawiczną sesję',
        calendar: {
          status: 'Kolejka na żywo',
          next: 'Następne odświeżenie za 00:30',
          title: 'Kolejka arcade',
          slots: {
            focus: {
              title: 'Sprint fokus · Krytyka UX',
              meta: '12 min • Rina (mentorka produktu)'
            },
            strategy: {
              title: 'Zastrzyk strategii · Pas startowy',
              meta: '28 min • Malik (coach wzrostu)'
            },
            clarity: {
              title: 'Kontrola klarowności · Opowieść o danych',
              meta: '45 min • Zia (przewodnik analityczny)'
            }
          },
          footnote: 'Automatyczne parowanie odświeża się co 30 sekund, aby utrzymać tempo.'
        },
        learner: {
          title: 'Power-upy dla uczących się',
          items: {
            0: 'Wrzucaj mikrocele i otrzymuj laserowy feedback bez kolejek.',
            1: 'Odblokuj kuratorowane misje treningowe po każdej sesji.',
            2: 'Synchronizuj notatki i nagrania prosto do swojego workspace Edulure.'
          }
        },
        instructor: {
          title: 'Power-upy dla instruktorów',
          items: {
            0: 'Wypełniaj wolne okna uczniami gotowymi na twoją specjalizację.',
            1: 'Odpalaj wielorazowe szablony sesji jednym neonowym kliknięciem.',
            2: 'Zgarniaj boosty widoczności, gdy spływają szybkie pięciogwiazdkowe oceny.'
          }
        }
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
        cards: {
          liveSession: {
            title: 'लाइव कोहोर्ट सत्र',
            meta: '12 घंटे में शुरू होगा',
            cta: 'रिमाइंडर सेट करें'
          },
          community: {
            title: 'समुदाय की धड़कन',
            status: 'अभी लाइव',
            headline: 'साप्ताहिक बिल्ड सर्कल',
            subhead: 'साथियों के साथ लॉन्च, फीडबैक और जीत साझा करें'
          },
          resource: {
            title: 'क्रिएटर टी डाइजेस्ट',
            meta: 'हर सोमवार नई सामग्री',
            cta: 'अभी पढ़ें'
          }
        },
        instructorPill: 'मैं प्रशिक्षक हूँ',
        illustrationAlt: 'प्रशिक्षकों और शिक्षार्थियों के सहयोग का कोलाज'
      },
      tutoring: {
        kicker: 'ट्यूटर आर्केड',
        headline: 'अपना अगला ब्रेकथ्रू सत्र कतार में लगाएँ',
        subhead:
          'ऑन-डिमांड मेंटर्स को सक्रिय करें, लक्ष्यों को कतार में डालें और हर कॉल से अपने रफ़्तार के मुताबिक़ पावर-अप के साथ निकलें।',
        ctaPrimary: 'ट्यूटर आर्केड देखें',
        ctaSecondary: 'झटपट सत्र बुक करें',
        calendar: {
          status: 'लाइव कतार',
          next: 'अगला रिफ्रेश 00:30 में',
          title: 'आर्केड कतार',
          slots: {
            focus: {
              title: 'फोकस स्प्रिंट · UX समीक्षा',
              meta: '12 मिन • रीना (प्रोडक्ट मेंटर)'
            },
            strategy: {
              title: 'रणनीति बूस्ट · लॉन्च रनवे',
              meta: '28 मिन • मलिक (ग्रोथ कोच)'
            },
            clarity: {
              title: 'स्पष्टता जांच · डेटा स्टोरीटेलिंग',
              meta: '45 मिन • जिया (एनालिटिक्स गाइड)'
            }
          },
          footnote: 'ऊर्जा बनाए रखने के लिए ऑटो-मैचिंग हर 30 सेकंड में ताज़ा होती है।'
        },
        learner: {
          title: 'सीखने वालों के पावर-अप',
          items: {
            0: 'माइक्रो लक्ष्य छोड़ें और बिना वेटलिस्ट के लेज़र जैसी प्रतिक्रिया पाएं।',
            1: 'हर सत्र के बाद क्यूरेटेड प्रैक्टिस क्वेस्ट अनलॉक करें।',
            2: 'अपने Edulure workspace में नोट्स और रिकॉर्डिंग तुरंत सिंक करें।'
          }
        },
        instructor: {
          title: 'इंस्ट्रक्टर पावर-अप',
          items: {
            0: 'अपने कौशल के अनुरूप तैयार शिक्षार्थियों से खाली स्लॉट भरें।',
            1: 'एक नीयॉन टैप से पुन: प्रयोज्य सत्र टेम्पलेट लॉन्च करें।',
            2: 'तेज़ पाँच-सितारा समीक्षाओं पर स्पॉटलाइट बूस्ट कमाएँ।'
          }
        }
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
        cards: {
          liveSession: {
            title: 'جلسة دفعة مباشرة',
            meta: 'تبدأ خلال 12 ساعة',
            cta: 'تعيين تذكير'
          },
          community: {
            title: 'نبض المجتمع',
            status: 'مباشر الآن',
            headline: 'حلقة بناء أسبوعية',
            subhead: 'شارك الإطلاقات والتعقيبات والنجاحات مع الأقران'
          },
          resource: {
            title: 'ملخص المبدعين',
            meta: 'إصدارات جديدة كل يوم اثنين',
            cta: 'اقرأ الآن'
          }
        },
        instructorPill: 'أنا مدرّس/ة',
        illustrationAlt: 'مجموعة صور لمدربين ومتعلّمين يتعاونون'
      },
      tutoring: {
        kicker: 'أركيد المدرّسين',
        headline: 'أدرج جلستك الحاسمة التالية في الطابور',
        subhead:
          'فعّل المرشدين عند الطلب، ضع أهدافك في الطابور، واغادر كل اتصال بترقية ملهمة تناسب سرعتك.',
        ctaPrimary: 'استكشف أركيد المدرّسين',
        ctaSecondary: 'احجز جلسة خاطفة',
        calendar: {
          status: 'طابور مباشر',
          next: 'التحديث التالي خلال 00:30',
          title: 'طابور الأركيد',
          slots: {
            focus: {
              title: 'اندفاعة تركيز · مراجعة UX',
              meta: '12 دقيقة • رينا (مرشدة منتج)'
            },
            strategy: {
              title: 'دفعة استراتيجية · مدرج الإطلاق',
              meta: '28 دقيقة • مالك (مدرّب نمو)'
            },
            clarity: {
              title: 'فحص وضوح · سرد البيانات',
              meta: '45 دقيقة • زيا (مرشدة تحليلات)'
            }
          },
          footnote: 'يُعاد ضبط المطابقة التلقائية كل 30 ثانية للحفاظ على الحماس.'
        },
        learner: {
          title: 'ترقيات المتعلمين',
          items: {
            0: 'أرسل أهدافًا مصغرة واحصل على تغذية راجعة دقيقة بلا قوائم انتظار.',
            1: 'افتح مسارات تدريب منتقاة بعد كل جلسة.',
            2: 'زامن الملاحظات والتسجيلات مباشرة إلى مساحة Edulure الخاصة بك.'
          }
        },
        instructor: {
          title: 'ترقيات المدرّسين',
          items: {
            0: 'املأ الفترات الفارغة بمتعلمين جاهزين لمجالك.',
            1: 'أطلق قوالب جلسات قابلة لإعادة الاستخدام بلمسة نيون واحدة.',
            2: 'احصل على دفعات spotlight عند تدفق تقييمات الخمس نجوم بسرعة.'
          }
        }
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
        cards: {
          liveSession: {
            title: 'Live-Kohorten-Session',
            meta: 'Startet in 12 Stunden',
            cta: 'Erinnerung setzen'
          },
          community: {
            title: 'Community-Puls',
            status: 'Jetzt live',
            headline: 'Wöchentlicher Build-Circle',
            subhead: 'Teile Launches, Feedback und Erfolge mit Peers'
          },
          resource: {
            title: 'Creator Tea Digest',
            meta: 'Neue Drops jeden Montag',
            cta: 'Jetzt lesen'
          }
        },
        instructorPill: 'Ich bin Trainer:in',
        illustrationAlt: 'Collage aus Lehrenden und Lernenden, die zusammenarbeiten'
      },
      tutoring: {
        kicker: 'Tutor-Arcade',
        headline: 'Stell deine nächste Durchbruch-Session in die Queue',
        subhead:
          'Aktiviere Mentoren on demand, leg Ziele in die Warteschlange und verlasse jeden Call mit einem Power-up, das deinen Flow stärkt.',
        ctaPrimary: 'Tutor-Arcade entdecken',
        ctaSecondary: 'Lightning-Session buchen',
        calendar: {
          status: 'Live-Warteschlange',
          next: 'Nächstes Refresh in 00:30',
          title: 'Arcade-Queue',
          slots: {
            focus: {
              title: 'Focus-Sprint · UX-Review',
              meta: '12 Min • Rina (Product-Mentorin)'
            },
            strategy: {
              title: 'Strategie-Boost · Launch-Runway',
              meta: '28 Min • Malik (Growth-Coach)'
            },
            clarity: {
              title: 'Clarity-Check · Data Storytelling',
              meta: '45 Min • Zia (Analytics-Guide)'
            }
          },
          footnote: 'Das Auto-Matching aktualisiert sich alle 30 Sekunden für maximale Energie.'
        },
        learner: {
          title: 'Power-ups für Lernende',
          items: {
            0: 'Dropp Mikroziele und erhalte Laser-Feedback ohne Warteschlangen.',
            1: 'Schalte kuratierte Practice-Quests nach jeder Session frei.',
            2: 'Synchronisiere Notizen und Replays direkt in deinen Edulure-Workspace.'
          }
        },
        instructor: {
          title: 'Power-ups für Instructor',
          items: {
            0: 'Fülle freie Slots mit Lernenden, die zu deinem Skillset passen.',
            1: 'Starte wiederverwendbare Session-Templates mit einem Neon-Tap.',
            2: 'Sichere dir Spotlight-Boosts, wenn Fünf-Sterne-Reviews im Takt eintrudeln.'
          }
        }
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
        cards: {
          liveSession: {
            title: 'Живой созвон потока',
            meta: 'Старт через 12 часов',
            cta: 'Поставить напоминание'
          },
          community: {
            title: 'Пульс сообщества',
            status: 'В эфире',
            headline: 'Еженедельный круг создателей',
            subhead: 'Делитесь релизами, обратной связью и победами с коллегами'
          },
          resource: {
            title: 'Дайджест создателя',
            meta: 'Новые выпуски каждый понедельник',
            cta: 'Читать сейчас'
          }
        },
        instructorPill: 'Я преподаватель',
        illustrationAlt: 'Коллаж из инструкторов и учащихся, работающих вместе'
      },
      tutoring: {
        kicker: 'Аркада тьюторов',
        headline: 'Поставьте в очередь следующую прорывную сессию',
        subhead:
          'Включайте наставников по требованию, загружайте цели в очередь и завершайте каждый созвон с прокачкой, созданной под ваш темп.',
        ctaPrimary: 'Исследовать аркаду тьюторов',
        ctaSecondary: 'Забронировать молниеносную сессию',
        calendar: {
          status: 'Живая очередь',
          next: 'Следующее обновление через 00:30',
          title: 'Аркадная очередь',
          slots: {
            focus: {
              title: 'Фокус-спринт · UX-разбор',
              meta: '12 мин • Рина (ментор по продукту)'
            },
            strategy: {
              title: 'Стратегический буст · Взлётная полоса',
              meta: '28 мин • Малик (коуч по росту)'
            },
            clarity: {
              title: 'Проверка ясности · Data storytelling',
              meta: '45 мин • Зия (аналитический наставник)'
            }
          },
          footnote: 'Автоподбор обновляется каждые 30 секунд, чтобы держать драйв.'
        },
        learner: {
          title: 'Прокачки для учеников',
          items: {
            0: 'Сбрасывайте микроцели и получайте точный фидбек без листов ожидания.',
            1: 'Открывайте кураторские практические квесты после каждой сессии.',
            2: 'Синхронизируйте заметки и записи прямо в своё пространство Edulure.'
          }
        },
        instructor: {
          title: 'Прокачки для инструкторов',
          items: {
            0: 'Заполняйте свободные окна учениками, готовыми к вашему мастерству.',
            1: 'Запускайте повторно используемые шаблоны сессий одним неоновым кликом.',
            2: 'Получайте бусты видимости, когда стремительно приходят пятёрки.'
          }
        }
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
