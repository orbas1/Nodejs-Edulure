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
      ebooks: {
        tagline: 'Community library',
        title: 'Turn knowledge into collectible storybooks',
        subtitle:
          'Browse playful previews from makers building in public—each zine is remixable and ready to share.',
        meta: 'Peer-made drops',
        carouselLabel: 'Swipe through featured community e-books',
        stickers: {
          new: 'New!',
          trending: 'Trending',
          remixable: 'Remix-ready'
        },
        cards: {
          builderNotebook: {
            tag: 'Product sprints',
            title: 'Builder’s Notebook',
            description: 'Rapid rituals and templates for shipping experiments faster.',
            alt: 'Illustrated cover for Builder’s Notebook showing gradient pages'
          },
          communityCookbook: {
            tag: 'Community rituals',
            title: 'Community Cookbook',
            description: 'Icebreakers, retros, and prompts sourced from active cohorts.',
            alt: 'Cover of Community Cookbook with playful green highlights'
          },
          remixAtlas: {
            tag: 'Remix lab',
            title: 'Remix Atlas',
            description: 'Swipe starter frameworks and remix them into your own journeys.',
            alt: 'Remix Atlas cover featuring arrows bending around a compass'
          }
        },
        panels: {
          readers: {
            label: 'Readers',
            title: 'Pocket-sized insights for every mood',
            bullets: {
              discovery: 'Discover bite-sized field guides for every creative phase.',
              sync: 'Sync progress across devices and pick up where you left off.',
              community: 'Unlock community annotations and highlight reels.'
            }
          },
          creators: {
            label: 'Creators',
            title: 'Delight fans and ship faster',
            bullets: {
              publish: 'Drop beautiful digital zines without design tools.',
              analytics: 'Track reads, saves, and remix requests in real time.',
              revenue: 'Bundle e-books with live sessions to boost revenue.'
            }
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
      ebooks: {
        tagline: 'Bibliothèque communautaire',
        title: 'Transformez le savoir en livres à collectionner',
        subtitle:
          'Parcourez des aperçus ludiques de créateurs qui construisent en public — chaque zine est remixable et prêt à partager.',
        meta: 'Parutions entre pairs',
        carouselLabel: 'Faites défiler les e-books phares de la communauté',
        stickers: {
          new: 'Nouveau !',
          trending: 'Tendance',
          remixable: 'Prêt pour remix'
        },
        cards: {
          builderNotebook: {
            tag: 'Sprints produit',
            title: 'Carnet du builder',
            description: 'Rituels et modèles pour expédier des expériences plus vite.',
            alt: 'Couverture illustrée du Carnet du builder avec des pages en dégradé'
          },
          communityCookbook: {
            tag: 'Rituels de communauté',
            title: 'Livre de recettes communautaire',
            description: 'Icebreakers, rétros et invitations issues de cohortes actives.',
            alt: 'Couverture du Livre de recettes communautaire avec des accents verts ludiques'
          },
          remixAtlas: {
            tag: 'Laboratoire remix',
            title: 'Atlas du remix',
            description: 'Capturez des canevas de départ et remixez-les pour vos propres parcours.',
            alt: 'Couverture de l’Atlas du remix avec des flèches autour d’une boussole'
          }
        },
        panels: {
          readers: {
            label: 'Lecteurs',
            title: 'Des pépites à glisser dans chaque humeur',
            bullets: {
              discovery: 'Découvrez des guides de terrain en format capsule pour chaque phase créative.',
              sync: 'Synchronisez votre progression sur tous vos appareils et reprenez où vous en étiez.',
              community: 'Débloquez les annotations communautaires et les moments forts.'
            }
          },
          creators: {
            label: 'Créateurs',
            title: 'Ravissez votre audience et livrez plus vite',
            bullets: {
              publish: 'Publiez de beaux zines numériques sans outils de design.',
              analytics: 'Suivez lectures, sauvegardes et demandes de remix en temps réel.',
              revenue: 'Associez e-books et sessions live pour booster vos revenus.'
            }
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
      ebooks: {
        tagline: 'Biblioteca comunitaria',
        title: 'Convierte el conocimiento en libros coleccionables',
        subtitle:
          'Explora avances juguetones de creadores que construyen en público; cada zine es remixable y listo para compartir.',
        meta: 'Lanzamientos entre pares',
        carouselLabel: 'Desliza por los e-books destacados de la comunidad',
        stickers: {
          new: '¡Nuevo!',
          trending: 'Tendencia',
          remixable: 'Listo para remix'
        },
        cards: {
          builderNotebook: {
            tag: 'Sprints de producto',
            title: 'Cuaderno del builder',
            description: 'Rituales y plantillas para lanzar experimentos más rápido.',
            alt: 'Portada ilustrada del Cuaderno del builder con páginas degradadas'
          },
          communityCookbook: {
            tag: 'Rituales comunitarios',
            title: 'Recetario comunitario',
            description: 'Icebreakers, retros y prompts recopilados de cohortes activas.',
            alt: 'Portada del Recetario comunitario con destellos verdes divertidos'
          },
          remixAtlas: {
            tag: 'Laboratorio remix',
            title: 'Atlas remix',
            description: 'Toma marcos iniciales y remíxalos para tus propias travesías.',
            alt: 'Portada del Atlas remix con flechas rodeando una brújula'
          }
        },
        panels: {
          readers: {
            label: 'Lectores',
            title: 'Ideas de bolsillo para cada estado de ánimo',
            bullets: {
              discovery: 'Descubre guías de campo en formato cápsula para cada fase creativa.',
              sync: 'Sincroniza tu progreso en todos tus dispositivos y retoma donde lo dejaste.',
              community: 'Desbloquea anotaciones de la comunidad y resúmenes destacados.'
            }
          },
          creators: {
            label: 'Creadores',
            title: 'Sorprende a tu comunidad y entrega más rápido',
            bullets: {
              publish: 'Publica zines digitales hermosos sin herramientas de diseño.',
              analytics: 'Sigue lecturas, guardados y solicitudes de remix en tiempo real.',
              revenue: 'Combina e-books con sesiones en vivo para impulsar los ingresos.'
            }
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
      ebooks: {
        tagline: 'Biblioteca da comunidade',
        title: 'Transforme conhecimento em livros colecionáveis',
        subtitle:
          'Explore prévias divertidas de quem constrói em público — cada zine é remixável e pronto para compartilhar.',
        meta: 'Lançamentos entre pares',
        carouselLabel: 'Deslize pelos e-books favoritos da comunidade',
        stickers: {
          new: 'Novo!',
          trending: 'Em alta',
          remixable: 'Pronto para remix'
        },
        cards: {
          builderNotebook: {
            tag: 'Sprints de produto',
            title: 'Caderno do builder',
            description: 'Rituais e modelos para lançar experimentos com mais velocidade.',
            alt: 'Capa ilustrada do Caderno do builder com páginas em degradê'
          },
          communityCookbook: {
            tag: 'Rituais da comunidade',
            title: 'Livro de receitas da comunidade',
            description: 'Icebreakers, retros e prompts coletados de cohortes ativas.',
            alt: 'Capa do Livro de receitas da comunidade com destaques verdes divertidos'
          },
          remixAtlas: {
            tag: 'Laboratório de remix',
            title: 'Atlas remix',
            description: 'Pegue frameworks iniciais e remixe para suas próprias jornadas.',
            alt: 'Capa do Atlas remix com setas em torno de uma bússola'
          }
        },
        panels: {
          readers: {
            label: 'Leitores',
            title: 'Insumos de bolso para cada momento',
            bullets: {
              discovery: 'Descubra guias de campo em cápsulas para cada fase criativa.',
              sync: 'Sincronize o progresso entre dispositivos e retome de onde parou.',
              community: 'Desbloqueie anotações da comunidade e destaques.'
            }
          },
          creators: {
            label: 'Criadores',
            title: 'Encante sua base e entregue mais rápido',
            bullets: {
              publish: 'Publique zines digitais lindos sem ferramentas de design.',
              analytics: 'Acompanhe leituras, salvamentos e pedidos de remix em tempo real.',
              revenue: 'Combine e-books com sessões ao vivo para impulsionar a receita.'
            }
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
      ebooks: {
        tagline: 'Biblioteca della community',
        title: 'Trasforma il sapere in libri da collezione',
        subtitle:
          'Sfoglia anteprime giocose di chi costruisce in pubblico: ogni zine è remixabile e pronta da condividere.',
        meta: 'Uscite tra pari',
        carouselLabel: 'Scorri gli e-book di punta della community',
        stickers: {
          new: 'Nuovo!',
          trending: 'Di tendenza',
          remixable: 'Pronto al remix'
        },
        cards: {
          builderNotebook: {
            tag: 'Sprints di prodotto',
            title: 'Taccuino del builder',
            description: 'Rituali e template per spedire esperimenti più in fretta.',
            alt: 'Copertina illustrata del Taccuino del builder con pagine sfumate'
          },
          communityCookbook: {
            tag: 'Rituali di community',
            title: 'Ricettario della community',
            description: 'Icebreaker, retro e prompt raccolti da coorti attive.',
            alt: 'Copertina del Ricettario della community con accenti verdi giocosi'
          },
          remixAtlas: {
            tag: 'Laboratorio remix',
            title: 'Atlas remix',
            description: 'Prendi framework di partenza e remixali per i tuoi percorsi.',
            alt: 'Copertina dell’Atlas remix con frecce che circondano una bussola'
          }
        },
        panels: {
          readers: {
            label: 'Lettori',
            title: 'Spunti tascabili per ogni stato d’animo',
            bullets: {
              discovery: 'Scopri guide da campo in formato mini per ogni fase creativa.',
              sync: 'Sincronizza i progressi tra dispositivi e riprendi da dove eri rimasto.',
              community: 'Sblocca annotazioni della community e momenti salienti.'
            }
          },
          creators: {
            label: 'Creator',
            title: 'Sorprendi il tuo pubblico e consegna più veloce',
            bullets: {
              publish: 'Pubblica zine digitali bellissime senza strumenti di design.',
              analytics: 'Monitora letture, salvataggi e richieste di remix in tempo reale.',
              revenue: 'Abbina e-book e sessioni live per incrementare le entrate.'
            }
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
      ebooks: {
        tagline: 'Biblioteka społeczności',
        title: 'Zamień wiedzę w kolekcjonerskie książki',
        subtitle:
          'Przeglądaj kolorowe zajawki twórców budujących publicznie — każdy zin można remiksować i udostępniać.',
        meta: 'Premiery od społeczności',
        carouselLabel: 'Przewijaj wyróżnione e-booki społeczności',
        stickers: {
          new: 'Nowość!',
          trending: 'Na topie',
          remixable: 'Gotowe do remiksu'
        },
        cards: {
          builderNotebook: {
            tag: 'Sprinty produktowe',
            title: 'Notatnik buildera',
            description: 'Rytuały i szablony, dzięki którym szybciej wypuścisz eksperymenty.',
            alt: 'Ilustrowana okładka Notatnika buildera z gradientowymi stronami'
          },
          communityCookbook: {
            tag: 'Rytuały społeczności',
            title: 'Książka kucharska społeczności',
            description: 'Icebreakery, retro i podpowiedzi zebrane od aktywnych kohort.',
            alt: 'Okładka Książki kucharskiej społeczności z zielonymi akcentami'
          },
          remixAtlas: {
            tag: 'Laboratorium remixu',
            title: 'Atlas remixu',
            description: 'Chwytaj ramy startowe i remiksuj je pod własne ścieżki.',
            alt: 'Okładka Atlasu remixu z strzałkami wokół kompasu'
          }
        },
        panels: {
          readers: {
            label: 'Czytelnicy',
            title: 'Kieszonkowe inspiracje na każdy nastrój',
            bullets: {
              discovery: 'Odkrywaj kapsułowe przewodniki terenowe na każdy etap kreatywny.',
              sync: 'Synchronizuj postępy między urządzeniami i wracaj dokładnie tam, gdzie skończyłeś.',
              community: 'Odblokuj społecznościowe adnotacje i highlighty.'
            }
          },
          creators: {
            label: 'Twórcy',
            title: 'Zachwycaj społeczność i działaj szybciej',
            bullets: {
              publish: 'Publikuj piękne cyfrowe ziny bez narzędzi projektowych.',
              analytics: 'Śledź odczyty, zapisy i prośby o remix w czasie rzeczywistym.',
              revenue: 'Łącz e-booki z sesjami live, aby zwiększyć przychody.'
            }
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
      ebooks: {
        tagline: 'समुदाय पुस्तकालय',
        title: 'ज्ञान को संग्रहणीय पुस्तकों में बदलें',
        subtitle:
          'सार्वजनिक रूप से निर्माण करने वाले निर्माताओं की चंचल झलकियाँ देखें — हर ज़ीन रीमिक्स करने और साझा करने के लिए तैयार है।',
        meta: 'साथियों द्वारा जारी',
        carouselLabel: 'समुदाय के पसंदीदा ई-बुक्स को स्वाइप करें',
        stickers: {
          new: 'नई!',
          trending: 'ट्रेंडिंग',
          remixable: 'रीमिक्स के लिए तैयार'
        },
        cards: {
          builderNotebook: {
            tag: 'उत्पाद स्प्रिंट्स',
            title: 'बिल्डर की नोटबुक',
            description: 'तेज़ी से प्रयोग शिप करने के लिए रीतियाँ और टेम्पलेट्स।',
            alt: 'ग्रेडिएंट पन्नों वाली बिल्डर की नोटबुक का चित्रित कवर'
          },
          communityCookbook: {
            tag: 'समुदाय रिवाज़',
            title: 'कम्युनिटी कुकबुक',
            description: 'सक्रिय कोहोर्ट्स से जुटाए गए आइसब्रेकर, रेट्रो और प्रॉम्प्ट्स।',
            alt: 'हरे playful हाईलाइट्स वाली कम्युनिटी कुकबुक का कवर'
          },
          remixAtlas: {
            tag: 'रीमिक्स प्रयोगशाला',
            title: 'रीमिक्स एटलस',
            description: 'स्टार्टर फ्रेमवर्क्स उठाएँ और उन्हें अपने सफ़र के लिए रीमिक्स करें।',
            alt: 'कम्पास के चारों ओर घूमते तीरों वाला रीमिक्स एटलस कवर'
          }
        },
        panels: {
          readers: {
            label: 'रीडर्स',
            title: 'हर मूड के लिए पॉकेट इनसाइट्स',
            bullets: {
              discovery: 'हर रचनात्मक चरण के लिए सूक्ष्म फील्ड गाइड खोजें।',
              sync: 'डिवाइसों के बीच प्रगति को सिंक करें और वहीं से शुरू करें जहाँ छोड़ा था।',
              community: 'समुदाय की टिप्पणियाँ और हाइलाइट झलकियाँ अनलॉक करें।'
            }
          },
          creators: {
            label: 'क्रिएटर्स',
            title: 'प्रशंसकों को खुश करें और तेजी से लॉन्च करें',
            bullets: {
              publish: 'डिज़ाइन टूल्स के बिना सुंदर डिजिटल ज़ीन प्रकाशित करें।',
              analytics: 'रीयल-टाइम में पढ़ाई, सेव और रीमिक्स अनुरोध ट्रैक करें।',
              revenue: 'ई-बुक्स को लाइव सत्रों के साथ बाँधकर राजस्व बढ़ाएँ।'
            }
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
      ebooks: {
        tagline: 'مكتبة المجتمع',
        title: 'حوّل المعرفة إلى كتب قابلة للجمع',
        subtitle:
          'تصفّح لمحات مرحة من صانعين يبنون على العلن — كل زين جاهز لإعادة المزج والمشاركة.',
        meta: 'إصدارات الأقران',
        carouselLabel: 'اسحب لاستعراض الكتب الإلكترونية المميزة في المجتمع',
        stickers: {
          new: 'جديد!',
          trending: 'رائج',
          remixable: 'جاهز لإعادة المزج'
        },
        cards: {
          builderNotebook: {
            tag: 'سباقات المنتج',
            title: 'دفتر الباني',
            description: 'طقوس ونماذج لتسريع شحن التجارب.',
            alt: 'غلاف مصوّر لدفتر الباني مع صفحات متدرجة الألوان'
          },
          communityCookbook: {
            tag: 'طقوس المجتمع',
            title: 'كتاب وصفات المجتمع',
            description: 'كاسرات جليد، مراجعات ومحفزات مأخوذة من دفعات نشطة.',
            alt: 'غلاف كتاب وصفات المجتمع مع لمسات خضراء مرحة'
          },
          remixAtlas: {
            tag: 'مختبر الريمكس',
            title: 'أطلس الريمكس',
            description: 'اقتنص أطر البداية وأعد مزجها لمساراتك الخاصة.',
            alt: 'غلاف أطلس الريمكس مع سهام تدور حول بوصلة'
          }
        },
        panels: {
          readers: {
            label: 'للقرّاء',
            title: 'رؤى صغيرة لكل مزاج',
            bullets: {
              discovery: 'اكتشف أدلة ميدانية مختصرة لكل مرحلة إبداعية.',
              sync: 'زامن تقدمك عبر الأجهزة وواصل من حيث توقفت.',
              community: 'افتح تعليقات المجتمع واللقطات المميزة.'
            }
          },
          creators: {
            label: 'للمبدعين',
            title: 'أبهِر جمهورك وانطلق بسرعة',
            bullets: {
              publish: 'أنشر زينات رقمية جميلة من دون أدوات تصميم.',
              analytics: 'تابع القراءات والحفظ وطلبات الريمكس مباشرة.',
              revenue: 'ادمج الكتب الإلكترونية مع الجلسات المباشرة لزيادة الإيرادات.'
            }
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
        ebooks: {
          tagline: 'Community-Bibliothek',
          title: 'Verwandle Wissen in sammelbare Storybooks',
          subtitle:
            'Stöbere durch verspielte Previews von Maker*innen, die öffentlich bauen – jedes Zine lässt sich remixen und teilen.',
          meta: 'Drops aus der Community',
          carouselLabel: 'Streife durch die beliebtesten Community-E-Books',
          stickers: {
            new: 'Neu!',
            trending: 'Im Trend',
            remixable: 'Remix-ready'
          },
          cards: {
            builderNotebook: {
              tag: 'Product Sprints',
              title: 'Builder’s Notebook',
              description: 'Rituale und Templates, um Experimente schneller zu shippen.',
              alt: 'Illustrierter Umschlag des Builder’s Notebook mit Farbverlauf'
            },
            communityCookbook: {
              tag: 'Community-Rituale',
              title: 'Community Cookbook',
              description: 'Icebreaker, Retros und Prompts aus aktiven Kohorten.',
              alt: 'Umschlag des Community Cookbook mit verspielten grünen Akzenten'
            },
            remixAtlas: {
              tag: 'Remix-Labor',
              title: 'Remix Atlas',
              description: 'Schnapp dir Start-Frameworks und remixe sie für deine eigenen Journeys.',
              alt: 'Remix-Atlas-Umschlag mit Pfeilen um einen Kompass'
            }
          },
          panels: {
            readers: {
              label: 'Für Leser*innen',
              title: 'Pocket-Insights für jede Stimmung',
              bullets: {
                discovery: 'Entdecke kompakte Field Guides für jede kreative Phase.',
                sync: 'Synchronisiere Fortschritt geräteübergreifend und mach genau dort weiter, wo du aufgehört hast.',
                community: 'Schalte Community-Notizen und Highlight-Reels frei.'
              }
            },
            creators: {
              label: 'Für Creator*innen',
              title: 'Begeistere Fans und liefere schneller',
              bullets: {
                publish: 'Veröffentliche schöne digitale Zines ohne Design-Tools.',
                analytics: 'Verfolge Reads, Saves und Remix-Anfragen in Echtzeit.',
                revenue: 'Bündle E-Books mit Live-Sessions und steigere den Umsatz.'
              }
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
        ebooks: {
          tagline: 'Библиотека сообщества',
          title: 'Превратите знания в коллекционные цифровые книги',
          subtitle:
            'Просматривайте яркие превью от создателей, которые строят на публике — каждый зин можно ремикснуть и поделиться.',
          meta: 'Релизы от участников',
          carouselLabel: 'Листайте избранные электронные книги сообщества',
          stickers: {
            new: 'Новинка!',
            trending: 'В тренде',
            remixable: 'Готово к ремиксу'
          },
          cards: {
            builderNotebook: {
              tag: 'Продуктовые спринты',
              title: 'Дневник билдера',
              description: 'Ритуалы и шаблоны, чтобы быстрее запускать эксперименты.',
              alt: 'Обложка Дневника билдера с градиентными страницами'
            },
            communityCookbook: {
              tag: 'Ритуалы сообщества',
              title: 'Комьюнити-книга рецептов',
              description: 'Айсбрекеры, ретро и подсказки от активных когорт.',
              alt: 'Обложка Комьюнити-книги рецептов с игривыми зелёными акцентами'
            },
            remixAtlas: {
              tag: 'Лаборатория ремиксов',
              title: 'Атлас ремиксов',
              description: 'Берите стартовые фреймворки и адаптируйте их под свои маршруты.',
              alt: 'Обложка Атласа ремиксов со стрелками вокруг компаса'
            }
          },
          panels: {
            readers: {
              label: 'Для читателей',
              title: 'Карманные инсайты на любой настрой',
              bullets: {
                discovery: 'Находите короткие полевые гиды для каждого этапа творчества.',
                sync: 'Синхронизируйте прогресс между устройствами и продолжайте с нужного места.',
                community: 'Открывайте доступ к заметкам и хайлайтам сообщества.'
              }
            },
            creators: {
              label: 'Для создателей',
              title: 'Удивляйте аудиторию и запускайте быстрее',
              bullets: {
                publish: 'Публикуйте красивые цифровые зины без дизайнерских инструментов.',
                analytics: 'Отслеживайте чтения, сохранения и запросы на ремикс в реальном времени.',
                revenue: 'Комбинируйте e-book’и с живыми сессиями, чтобы увеличить доход.'
              }
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
