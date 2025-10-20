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
      preview: {
        title: 'See what’s waiting inside the Edulure clubhouse',
        subtitle:
          'Toggle between community rooms, curriculum, and live ops to feel the flow before you sign in.',
        helper: 'Spotlights from this week’s launches',
        cta: 'Browse all spaces',
        footnote: 'Fresh previews rotate every Monday at 09:00 UTC.',
        tabs: {
          communities: {
            label: 'Communities',
            caption: 'Threaded clubhouses with rituals built in.',
            description:
              'Spin up themed rooms, layer rituals, and keep every cohort pulsing with guided prompts that surface fresh wins.',
            highlightOne: 'Guided weekly prompts',
            highlightTwo: 'Moderation cues baked in',
            highlightThree: 'Members see wins instantly',
            imageAlt: 'Preview of Edulure community spaces'
          },
          courses: {
            label: 'Courses',
            caption: 'Story-based curricula without the spreadsheets.',
            description:
              'Design multi-week arcs, stack media-rich lessons, and publish refreshes without exporting a single syllabus spreadsheet.',
            highlightOne: 'Drag-and-drop modules',
            highlightTwo: 'Completion signals live',
            highlightThree: 'Scope updates in real time',
            imageAlt: 'Preview of Edulure course builder interface'
          },
          liveEvents: {
            label: 'Live events',
            caption: 'Studio energy minus the chaos.',
            description:
              'Host jam sessions, AMAs, and office hours with a control room that keeps chat, back-channel notes, and recordings in sync.',
            highlightOne: 'Green-room checklists',
            highlightTwo: 'Auto recordings ready',
            highlightThree: 'Backstage chat for hosts',
            imageAlt: 'Preview of Edulure live event control center'
          },
          library: {
            label: 'Resource library',
            caption: 'A candy shop of downloads and replays.',
            description:
              'Curate templates, replays, and swipe files with smart filters so learners always find the exact asset they need.',
            highlightOne: 'Filter by format fast',
            highlightTwo: 'Smart recs rotate weekly',
            highlightThree: 'Brand-safe sharing links',
            imageAlt: 'Preview of Edulure resource library grid'
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
      preview: {
        title: 'Découvrez ce qui vous attend dans la maison Edulure',
        subtitle:
          'Parcourez les salons communautaires, les cursus et les opérations live pour sentir l’énergie avant même de vous connecter.',
        helper: 'Mises en avant des lancements de la semaine',
        cta: 'Explorer tous les espaces',
        footnote: 'Nouveaux aperçus chaque lundi à 09h00 UTC.',
        tabs: {
          communities: {
            label: 'Communautés',
            caption: 'Clubs en fil de discussion, rituels inclus.',
            description:
              'Lancez des salons thématiques, cadencez les rituels et maintenez chaque cohorte en mouvement grâce à des invites guidées.',
            highlightOne: 'Invites hebdomadaires guidées',
            highlightTwo: 'Repères de modération intégrés',
            highlightThree: 'Les victoires des membres émergent instantanément',
            imageAlt: 'Aperçu des espaces communautaires Edulure'
          },
          courses: {
            label: 'Cours',
            caption: 'Des parcours narratifs sans tableurs.',
            description:
              'Concevez des arcs sur plusieurs semaines, empilez des leçons riches en médias et publiez des rafraîchissements sans exporter un seul tableur.',
            highlightOne: 'Modules à glisser-déposer',
            highlightTwo: 'Signaux de complétion en direct',
            highlightThree: 'Mises à jour en temps réel',
            imageAlt: "Aperçu de l’éditeur de cours Edulure"
          },
          liveEvents: {
            label: 'Événements live',
            caption: 'Énergie studio, zéro chaos.',
            description:
              'Organisez jams, AMA et permanences avec une régie qui synchronise chat, notes backstage et enregistrements.',
            highlightOne: 'Checklist de loge technique',
            highlightTwo: 'Enregistrements automatiques prêts',
            highlightThree: 'Backstage de discussion pour les hôtes',
            imageAlt: 'Aperçu de la régie des événements live Edulure'
          },
          library: {
            label: 'Bibliothèque de ressources',
            caption: 'Un candy shop de téléchargements et replays.',
            description:
              'Curatez modèles, replays et playbooks avec des filtres malins pour que chacun trouve l’actif parfait.',
            highlightOne: 'Filtrage rapide par format',
            highlightTwo: 'Recommandations dynamiques chaque semaine',
            highlightThree: 'Liens de partage sûrs pour la marque',
            imageAlt: 'Aperçu de la grille de la bibliothèque Edulure'
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
      preview: {
        title: 'Descubre lo que te espera en la casa Edulure',
        subtitle:
          'Alterna entre salas comunitarias, currículum y operaciones en vivo para sentir el flujo antes de iniciar sesión.',
        helper: 'Destacados de los lanzamientos de esta semana',
        cta: 'Explorar todos los espacios',
        footnote: 'Nuevas vistas previas cada lunes a las 09:00 UTC.',
        tabs: {
          communities: {
            label: 'Comunidades',
            caption: 'Clubes con hilos y rituales incluidos.',
            description:
              'Activa salas temáticas, marca rituales y mantiene cada cohorte vibrando con indicaciones guiadas.',
            highlightOne: 'Indicaciones semanales guiadas',
            highlightTwo: 'Señales de moderación integradas',
            highlightThree: 'Las victorias de la comunidad aparecen al instante',
            imageAlt: 'Vista previa de los espacios comunitarios de Edulure'
          },
          courses: {
            label: 'Cursos',
            caption: 'Currículos narrativos sin hojas de cálculo.',
            description:
              'Diseña arcos de varias semanas, apila lecciones ricas en medios y publica actualizaciones sin exportar hojas de cálculo.',
            highlightOne: 'Módulos arrastrar y soltar',
            highlightTwo: 'Señales de finalización en vivo',
            highlightThree: 'Actualizaciones en tiempo real',
            imageAlt: 'Vista previa del editor de cursos de Edulure'
          },
          liveEvents: {
            label: 'Eventos en vivo',
            caption: 'Energía de estudio, cero caos.',
            description:
              'Organiza jams, AMAs y mentorías con una cabina que sincroniza chat, notas backstage y grabaciones.',
            highlightOne: 'Listas de control de camerino',
            highlightTwo: 'Grabaciones automáticas listas',
            highlightThree: 'Chat tras bambalinas para anfitriones',
            imageAlt: 'Vista previa del centro de eventos en vivo de Edulure'
          },
          library: {
            label: 'Biblioteca de recursos',
            caption: 'Un candy shop de descargas y replays.',
            description:
              'Curaduría de plantillas, replays y playbooks con filtros inteligentes para encontrar el recurso exacto.',
            highlightOne: 'Filtra por formato en segundos',
            highlightTwo: 'Recomendaciones inteligentes que rotan',
            highlightThree: 'Enlaces seguros para la marca',
            imageAlt: 'Vista previa de la cuadrícula de biblioteca de Edulure'
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
      preview: {
        title: 'Veja o que espera por você na casa Edulure',
        subtitle:
          'Alterne entre salas da comunidade, currículo e operações ao vivo para sentir o ritmo antes de entrar.',
        helper: 'Destaques dos lançamentos da semana',
        cta: 'Explorar todos os espaços',
        footnote: 'Novas prévias toda segunda-feira às 09h00 UTC.',
        tabs: {
          communities: {
            label: 'Comunidades',
            caption: 'Clubes em formato de thread com rituais incluídos.',
            description:
              'Lance salas temáticas, cadencie rituais e mantenha cada coorte vibrante com prompts guiados.',
            highlightOne: 'Prompts semanais guiados',
            highlightTwo: 'Sinais de moderação embutidos',
            highlightThree: 'Vitórias dos membros aparecem na hora',
            imageAlt: 'Prévia dos espaços comunitários Edulure'
          },
          courses: {
            label: 'Cursos',
            caption: 'Currículos narrativos sem planilhas.',
            description:
              'Desenhe arcos de várias semanas, empilhe aulas ricas em mídia e publique atualizações sem exportar planilhas.',
            highlightOne: 'Módulos arrastar e soltar',
            highlightTwo: 'Sinais de conclusão ao vivo',
            highlightThree: 'Atualizações em tempo real',
            imageAlt: 'Prévia do construtor de cursos Edulure'
          },
          liveEvents: {
            label: 'Eventos ao vivo',
            caption: 'Energia de estúdio, zero caos.',
            description:
              'Hospede jams, AMAs e plantões com uma central que sincroniza chat, notas de bastidor e gravações.',
            highlightOne: 'Checklists de camarim',
            highlightTwo: 'Gravações automáticas prontas',
            highlightThree: 'Chat de bastidor para anfitriões',
            imageAlt: 'Prévia da central de eventos ao vivo da Edulure'
          },
          library: {
            label: 'Biblioteca de recursos',
            caption: 'Uma doceria de downloads e replays.',
            description:
              'Curate templates, replays e playbooks com filtros inteligentes para que todos encontrem o ativo certo.',
            highlightOne: 'Filtre por formato num piscar',
            highlightTwo: 'Recomendações inteligentes que giram',
            highlightThree: 'Links de compartilhamento seguros para a marca',
            imageAlt: 'Prévia da grade da biblioteca Edulure'
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
      preview: {
        title: 'Scopri cosa ti aspetta nella casa Edulure',
        subtitle:
          'Passa tra sale community, curriculum e live ops per percepire il ritmo prima di accedere.',
        helper: 'Highlights dei lanci di questa settimana',
        cta: 'Esplora tutti gli spazi',
        footnote: 'Nuove anteprime ogni lunedì alle 09:00 UTC.',
        tabs: {
          communities: {
            label: 'Comunità',
            caption: 'Club a thread con rituali inclusi.',
            description:
              'Avvia sale tematiche, scandisci rituali e mantieni ogni coorte in movimento con prompt guidati.',
            highlightOne: 'Prompt settimanali guidati',
            highlightTwo: 'Segnali di moderazione integrati',
            highlightThree: 'I successi della community emergono subito',
            imageAlt: 'Anteprima degli spazi community di Edulure'
          },
          courses: {
            label: 'Corsi',
            caption: 'Curricula narrativi senza fogli di calcolo.',
            description:
              'Progetta archi di più settimane, impila lezioni ricche di media e pubblica refresh senza esportare un solo foglio.',
            highlightOne: 'Moduli drag & drop',
            highlightTwo: 'Segnali di completamento live',
            highlightThree: 'Aggiornamenti in tempo reale',
            imageAlt: 'Anteprima del course builder Edulure'
          },
          liveEvents: {
            label: 'Eventi live',
            caption: 'Energia da studio, zero caos.',
            description:
              'Conduci jam, AMA e office hour con una regia che sincronizza chat, note backstage e registrazioni.',
            highlightOne: 'Checklist di backstage',
            highlightTwo: 'Registrazioni automatiche pronte',
            highlightThree: 'Chat dietro le quinte per gli host',
            imageAlt: 'Anteprima della regia eventi live Edulure'
          },
          library: {
            label: 'Libreria risorse',
            caption: 'Una candy shop di download e replay.',
            description:
              'Cura template, replay e playbook con filtri intelligenti così tutti trovano l’asset giusto.',
            highlightOne: 'Filtra per formato in un attimo',
            highlightTwo: 'Raccomandazioni smart che ruotano',
            highlightThree: 'Link di condivisione brand-safe',
            imageAlt: 'Anteprima della griglia biblioteca Edulure'
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
      preview: {
        title: 'Zobacz, co czeka w domu Edulure',
        subtitle:
          'Przełączaj się między salami społeczności, programem i operacjami na żywo, aby poczuć klimat przed logowaniem.',
        helper: 'Wyróżnione premiery tygodnia',
        cta: 'Poznaj wszystkie przestrzenie',
        footnote: 'Nowe podglądy w każdy poniedziałek o 09:00 UTC.',
        tabs: {
          communities: {
            label: 'Społeczności',
            caption: 'Kluby w wątkach z gotowymi rytuałami.',
            description:
              'Uruchamiaj tematyczne pokoje, ustaw rytuały i utrzymuj każdą kohortę w ruchu dzięki prowadzącym podpowiedziom.',
            highlightOne: 'Prowadzone cotygodniowe podpowiedzi',
            highlightTwo: 'Wbudowane wskazówki moderacji',
            highlightThree: 'Sukcesy członków widoczne od razu',
            imageAlt: 'Podgląd przestrzeni społeczności Edulure'
          },
          courses: {
            label: 'Kursy',
            caption: 'Narracyjne programy bez arkuszy kalkulacyjnych.',
            description:
              'Projektuj wielotygodniowe ścieżki, układaj lekcje pełne mediów i publikuj odświeżenia bez eksportu arkuszy.',
            highlightOne: 'Moduły drag & drop',
            highlightTwo: 'Sygnały ukończenia na żywo',
            highlightThree: 'Aktualizacje w czasie rzeczywistym',
            imageAlt: 'Podgląd edytora kursów Edulure'
          },
          liveEvents: {
            label: 'Wydarzenia na żywo',
            caption: 'Energia studia, zero chaosu.',
            description:
              'Prowadź jamy, AMA i dyżury z reżyserką, która synchronizuje czat, notatki backstage i nagrania.',
            highlightOne: 'Listy kontrolne backstagu',
            highlightTwo: 'Automatyczne nagrania gotowe',
            highlightThree: 'Backstage chat dla prowadzących',
            imageAlt: 'Podgląd reżyserki wydarzeń na żywo Edulure'
          },
          library: {
            label: 'Biblioteka zasobów',
            caption: 'Słodki sklep z plikami i replayami.',
            description:
              'Kuruj szablony, replaye i playbooki z inteligentnymi filtrami, by każdy znalazł potrzebny zasób.',
            highlightOne: 'Szybkie filtrowanie po formacie',
            highlightTwo: 'Sprytne rekomendacje rotują co tydzień',
            highlightThree: 'Bezpieczne dla marki linki do udostępniania',
            imageAlt: 'Podgląd siatki biblioteki Edulure'
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
      preview: {
        title: 'देखें एड्यूलर घर के अंदर क्या इंतज़ार कर रहा है',
        subtitle:
          'समुदाय कक्षों, पाठ्यक्रम और लाइव ऑप्स के बीच स्विच करें और लॉग इन करने से पहले ही माहौल महसूस करें.',
        helper: 'इस सप्ताह के लॉन्च हाइलाइट्स',
        cta: 'सभी स्पेस देखें',
        footnote: 'हर सोमवार 09:00 UTC पर नई झलकियाँ।',
        tabs: {
          communities: {
            label: 'समुदाय',
            caption: 'थ्रेड वाले क्लब, रिवाज पहले से तैयार.',
            description:
              'थीम वाले रूम चालू करें, रिवाज सेट करें और गाइडेड प्रॉम्प्ट्स से हर कोहोर्ट को चालू रखें.',
            highlightOne: 'साप्ताहिक गाइडेड प्रॉम्प्ट्स',
            highlightTwo: 'अंदरूनी मॉडरेशन संकेत',
            highlightThree: 'सदस्यों की जीत तुरंत दिखे',
            imageAlt: 'एड्यूलर समुदाय स्पेस का पूर्वावलोकन'
          },
          courses: {
            label: 'पाठ्यक्रम',
            caption: 'कहानी आधारित करिकुलम बिना स्प्रेडशीट के.',
            description:
              'बहु-सप्ताह के आर्क डिज़ाइन करें, मीडिया-समृद्ध पाठ जोड़ें और बिना स्प्रेडशीट एक्सपोर्ट किए अपडेट प्रकाशित करें.',
            highlightOne: 'ड्रैग-एंड-ड्रॉप मॉड्यूल',
            highlightTwo: 'रियल-टाइम पूरा होने के संकेत',
            highlightThree: 'तुरंत स्कोप अपडेट्स',
            imageAlt: 'एड्यूलर पाठ्यक्रम बिल्डर का पूर्वावलोकन'
          },
          liveEvents: {
            label: 'लाइव इवेंट्स',
            caption: 'स्टूडियो की ऊर्जा, बिना अव्यवस्था.',
            description:
              'जैम, AMA और ऑफिस आवर्स को ऐसे कंट्रोल रूम से होस्ट करें जो चैट, बैकस्टेज नोट्स और रिकॉर्डिंग को सिंक रखता है.',
            highlightOne: 'ग्रीन-रूम चेकलिस्ट',
            highlightTwo: 'ऑटो रिकॉर्डिंग तैयार',
            highlightThree: 'होस्ट के लिए बैकस्टेज चैट',
            imageAlt: 'एड्यूलर लाइव इवेंट कंट्रोल का पूर्वावलोकन'
          },
          library: {
            label: 'संसाधन लाइब्रेरी',
            caption: 'डाउनलोड और रिप्ले का मीठा स्टोर.',
            description:
              'टेम्पलेट, रिप्ले और प्लेबुक को स्मार्ट फिल्टर के साथ क्यूरेट करें ताकि सीखने वाले तुरंत सही संसाधन पाएँ.',
            highlightOne: 'फॉर्मेट अनुसार तुरंत फ़िल्टर',
            highlightTwo: 'हर हफ्ते घूमती स्मार्ट सिफारिशें',
            highlightThree: 'ब्रांड-सुरक्षित शेयर लिंक',
            imageAlt: 'एड्यूलर संसाधन लाइब्रेरी ग्रिड का पूर्वावलोकन'
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
      preview: {
        title: 'اكتشف ما ينتظرك داخل بيت إدولور',
        subtitle:
          'تنقّل بين غرف المجتمع، المناهج، والعمليات المباشرة لتشعر بالإيقاع قبل تسجيل الدخول.',
        helper: 'أبرز إصدارات هذا الأسبوع',
        cta: 'استكشاف جميع المساحات',
        footnote: 'معاينات جديدة كل يوم اثنين الساعة 09:00 بتوقيت UTC.',
        tabs: {
          communities: {
            label: 'المجتمعات',
            caption: 'أندية بخيوط محادثة وطقوس جاهزة.',
            description:
              'أطلق غرفاً موضوعية، اضبط الطقوس، وأبق كل دفعة نابضة بفضل المطالبات الموجهة.',
            highlightOne: 'مطالبات أسبوعية موجهة',
            highlightTwo: 'إشارات ضبط مضمنة',
            highlightThree: 'نجاحات الأعضاء تظهر فوراً',
            imageAlt: 'معاينة لمساحات المجتمع في إدولور'
          },
          courses: {
            label: 'الدورات',
            caption: 'مناهج قصصية بدون جداول بيانات.',
            description:
              'صمّم مسارات لعدة أسابيع، أضف دروساً غنية بالوسائط، وانشر التحديثات من دون أي تصدير لجداول.',
            highlightOne: 'وحدات سحب وإفلات',
            highlightTwo: 'إشارات إكمال مباشرة',
            highlightThree: 'تحديثات نطاق لحظية',
            imageAlt: 'معاينة لمحرر الدورات في إدولور'
          },
          liveEvents: {
            label: 'الفعاليات المباشرة',
            caption: 'طاقة الاستوديو بلا فوضى.',
            description:
              'استضف جلسات، AMA وساعات مكتبية من غرفة تحكم تزامن الدردشة، ملاحظات الكواليس والتسجيلات.',
            highlightOne: 'قوائم تدقيق لغرفة الانتظار',
            highlightTwo: 'تسجيلات تلقائية جاهزة',
            highlightThree: 'دردشة خلف الكواليس للمضيفين',
            imageAlt: 'معاينة لغرفة التحكم بالفعاليات المباشرة في إدولور'
          },
          library: {
            label: 'مكتبة الموارد',
            caption: 'متجر حلويات للتحميلات والإعادات.',
            description:
              'نسّق القوالب، الإعادات ودفاتر اللعب مع فلاتر ذكية ليجد المتعلمون المورد المناسب فوراً.',
            highlightOne: 'تصفية سريعة حسب التنسيق',
            highlightTwo: 'توصيات ذكية تتغير أسبوعياً',
            highlightThree: 'روابط مشاركة آمنة للعلامة',
            imageAlt: 'معاينة لشبكة مكتبة إدولور'
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
      preview: {
        title: 'Entdecke, was dich im Edulure Clubhouse erwartet',
        subtitle:
          'Wechsle zwischen Community-Räumen, Curriculum und Live-Operations, um den Flow vor dem Login zu fühlen.',
        helper: 'Highlights der Launches dieser Woche',
        cta: 'Alle Spaces erkunden',
        footnote: 'Neue Previews jeden Montag um 09:00 UTC.',
        tabs: {
          communities: {
            label: 'Communities',
            caption: 'Thread-basierte Clubs mit eingebauten Ritualen.',
            description:
              'Starte thematische Räume, takte Rituale und halte jede Kohorte mit geführten Prompts in Bewegung.',
            highlightOne: 'Geführte Wochenprompts',
            highlightTwo: 'Integrierte Moderationshinweise',
            highlightThree: 'Mitglieder-Erfolge sofort sichtbar',
            imageAlt: 'Vorschau der Edulure-Community-Bereiche'
          },
          courses: {
            label: 'Kurse',
            caption: 'Story-basierte Curricula ohne Tabellen.',
            description:
              'Gestalte mehrwöchige Bögen, staple medienreiche Lektionen und veröffentliche Updates ohne Tabellenexport.',
            highlightOne: 'Drag-and-drop-Module',
            highlightTwo: 'Live-Abschluss-Signale',
            highlightThree: 'Aktualisierungen in Echtzeit',
            imageAlt: 'Vorschau des Edulure-Kursbuilders'
          },
          liveEvents: {
            label: 'Live-Events',
            caption: 'Studio-Energie ohne Chaos.',
            description:
              'Hoste Jams, AMAs und Office Hours mit einer Regie, die Chat, Backstage-Notizen und Aufnahmen synchron hält.',
            highlightOne: 'Backstage-Checklisten',
            highlightTwo: 'Automatische Aufzeichnungen bereit',
            highlightThree: 'Backstage-Chat für Hosts',
            imageAlt: 'Vorschau des Edulure-Live-Event-Control-Centers'
          },
          library: {
            label: 'Ressourcenbibliothek',
            caption: 'Ein Candy-Shop für Downloads und Replays.',
            description:
              'Kuratiere Templates, Replays und Playbooks mit smarten Filtern, damit Lernende schnell das richtige Asset finden.',
            highlightOne: 'Schnell nach Format filtern',
            highlightTwo: 'Clevere Empfehlungen rotieren wöchentlich',
            highlightThree: 'Markensichere Freigabelinks',
            imageAlt: 'Vorschau des Edulure-Bibliotheksrasters'
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
      preview: {
        title: 'Посмотрите, что ждёт внутри клуба Edulure',
        subtitle:
          'Переключайтесь между комнатами сообщества, учебными треками и лайв-операциями, чтобы почувствовать атмосферу до входа.',
        helper: 'Главные релизы недели',
        cta: 'Исследовать все пространства',
        footnote: 'Новые превью каждый понедельник в 09:00 UTC.',
        tabs: {
          communities: {
            label: 'Сообщества',
            caption: 'Клубы в форматах тредов с готовыми ритуалами.',
            description:
              'Запускайте тематические комнаты, задавайте ритуалы и держите каждую когорту в тонусе с помощью направляющих подсказок.',
            highlightOne: 'Еженедельные подсказки с сопровождением',
            highlightTwo: 'Встроенные сигналы модерации',
            highlightThree: 'Победы участников видны мгновенно',
            imageAlt: 'Предпросмотр пространств сообщества Edulure'
          },
          courses: {
            label: 'Курсы',
            caption: 'Нарративные курсы без таблиц.',
            description:
              'Проектируйте многонедельные дуги, добавляйте насыщенные медиа уроки и публикуйте обновления без экспорта таблиц.',
            highlightOne: 'Модули drag-and-drop',
            highlightTwo: 'Онлайн-сигналы завершения',
            highlightThree: 'Обновления в реальном времени',
            imageAlt: 'Предпросмотр конструктора курсов Edulure'
          },
          liveEvents: {
            label: 'Живые события',
            caption: 'Энергия студии без хаоса.',
            description:
              'Проводите джемы, AMA и офис-часы в пульте, который синхронизирует чат, бэк-ноты и записи.',
            highlightOne: 'Чек-листы гримерки',
            highlightTwo: 'Автозаписи готовы',
            highlightThree: 'Бэкстейдж-чат для ведущих',
            imageAlt: 'Предпросмотр контрольной комнаты лайв-событий Edulure'
          },
          library: {
            label: 'Библиотека ресурсов',
            caption: 'Кондитерская из материалов и записей.',
            description:
              'Курируйте шаблоны, записи и плейбуки с умными фильтрами, чтобы участники мгновенно находили нужный актив.',
            highlightOne: 'Быстрая фильтрация по формату',
            highlightTwo: 'Умные рекомендации обновляются еженедельно',
            highlightThree: 'Безопасные для бренда ссылки на шаринг',
            imageAlt: 'Предпросмотр сетки библиотеки Edulure'
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
