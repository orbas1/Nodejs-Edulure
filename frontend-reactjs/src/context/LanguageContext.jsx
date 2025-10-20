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
      perks: {
        eyebrow: 'Playful perks',
        headline: 'Perks that keep the learning energy high',
        subhead: 'Playful boosts designed for curious learners and hands-on instructors.',
        learnersLabel: 'For Learners',
        instructorsLabel: 'For Instructors',
        items: {
          communityMagnetism: {
            title: 'Community magnetism',
            learners: 'Drop into cozy rooms, prompts, and rituals that make momentum feel fun.',
            instructors: 'Spin up playful spaces and nudge everyone into flow without friction.'
          },
          liveStudioVibes: {
            title: 'Live studio vibes',
            learners: 'Jump into interactive jams with polls, whiteboards, and breakout sparks.',
            instructors: 'Host agenda-driven sessions and remix formats without juggling ten tools.'
          },
          contentPlayground: {
            title: 'Content playground',
            learners: 'Binge micro lessons, swipeable clips, and peer-built templates on demand.',
            instructors: 'Ship drops, challenges, and resources in minutes with beautiful defaults.'
          },
          signalBoosts: {
            title: 'Signal boosts',
            learners: 'Show off wins, gather kudos, and feel the community cheering you on.',
            instructors: 'Spot rising stars and amplify milestones automatically in the feed.'
          },
          supportLoop: {
            title: 'Support loop',
            learners: 'Ask for help in context-aware threads and get replies that stick.',
            instructors: 'Keep DMs tidy while automations route FAQs and follow-ups for you.'
          },
          growthOps: {
            title: 'Growth ops',
            learners: 'Unlock badges, levels, and surprise drops as you keep showing up.',
            instructors: 'Track funnels, revenue, and experiments with dashboards built for learning ops.'
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
      perks: {
        eyebrow: 'Avantages ludiques',
        headline: 'Des avantages qui maintiennent l\'énergie d\'apprentissage',
        subhead:
          'Des boosts ludiques pensés pour les apprenant·e·s curieux·ses et les instructeur·rice·s impliqué·e·s.',
        learnersLabel: 'Pour les apprenant·e·s',
        instructorsLabel: 'Pour les instructeur·rice·s',
        items: {
          communityMagnetism: {
            title: 'Magnétisme communautaire',
            learners: 'Entrez dans des salons chaleureux, des invites et des rituels qui rendent l\'élan joyeux.',
            instructors: 'Créez des espaces ludiques et mettez tout le monde en mouvement sans friction.'
          },
          liveStudioVibes: {
            title: 'Ambiance studio en direct',
            learners: 'Participez à des jams interactifs avec sondages, tableaux blancs et éclats en sous-groupes.',
            instructors: 'Animez des sessions structurées et remixez les formats sans jongler avec dix outils.'
          },
          contentPlayground: {
            title: 'Terrain de jeu de contenus',
            learners: 'Dévorez micro-leçons, clips swipeables et modèles créés par les pairs à la demande.',
            instructors: 'Publiez drops, défis et ressources en quelques minutes avec de beaux gabarits.'
          },
          signalBoosts: {
            title: 'Boosts de signal',
            learners: 'Mettez vos réussites en avant, récoltez des kudos et sentez la communauté vous encourager.',
            instructors: 'Repérez les talents émergents et amplifiez les jalons automatiquement dans le fil.'
          },
          supportLoop: {
            title: 'Boucle de soutien',
            learners: 'Demandez de l\'aide dans des fils contextualisés et recevez des réponses qui restent.',
            instructors: 'Gardez les messages privés ordonnés pendant que les automatisations routent FAQ et relances.'
          },
          growthOps: {
            title: 'Opérations de croissance',
            learners: 'Débloquez badges, niveaux et surprises au fil de votre engagement.',
            instructors: 'Suivez tunnels, revenus et expérimentations avec des tableaux de bord dédiés aux learning ops.'
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
      perks: {
        eyebrow: 'Beneficios con chispa',
        headline: 'Beneficios que mantienen la energía de aprendizaje',
        subhead: 'Impulsos lúdicos pensados para aprendices curiosos y docentes prácticos.',
        learnersLabel: 'Para estudiantes',
        instructorsLabel: 'Para instructores',
        items: {
          communityMagnetism: {
            title: 'Magnetismo comunitario',
            learners: 'Entra en salas acogedoras, prompts y rituales que hacen que el impulso sea divertido.',
            instructors: 'Crea espacios juguetones y guía a todos hacia el flujo sin fricción.'
          },
          liveStudioVibes: {
            title: 'Vibras de estudio en vivo',
            learners: 'Participa en jams interactivos con encuestas, pizarras y chispas en subgrupos.',
            instructors: 'Dirige sesiones con agenda y remezcla formatos sin malabarear diez herramientas.'
          },
          contentPlayground: {
            title: 'Parque de contenidos',
            learners: 'Maratonea microlecciones, clips deslizables y plantillas creadas por pares cuando quieras.',
            instructors: 'Lanza drops, desafíos y recursos en minutos con presets hermosos.'
          },
          signalBoosts: {
            title: 'Impulsos de señal',
            learners: 'Presume logros, gana kudos y siente a la comunidad animándote.',
            instructors: 'Detecta talentos emergentes y amplifica hitos automáticamente en el feed.'
          },
          supportLoop: {
            title: 'Bucle de soporte',
            learners: 'Pide ayuda en hilos con contexto y recibe respuestas que perduran.',
            instructors: 'Mantén los mensajes privados ordenados mientras las automatizaciones dirigen FAQs y seguimientos por ti.'
          },
          growthOps: {
            title: 'Operaciones de crecimiento',
            learners: 'Desbloquea insignias, niveles y sorpresas mientras sigues participando.',
            instructors: 'Controla embudos, ingresos y experimentos con tableros hechos para learning ops.'
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
      perks: {
        eyebrow: 'Benefícios divertidos',
        headline: 'Benefícios que mantêm a energia de aprendizagem',
        subhead: 'Impulsos lúdicos pensados para aprendizes curiosos e instrutores práticos.',
        learnersLabel: 'Para estudantes',
        instructorsLabel: 'Para instrutores',
        items: {
          communityMagnetism: {
            title: 'Magnetismo da comunidade',
            learners: 'Entre em salas acolhedoras, prompts e rituais que deixam o ritmo mais leve.',
            instructors: 'Crie espaços divertidos e coloque todo mundo em fluxo sem atrito.'
          },
          liveStudioVibes: {
            title: 'Vibes de estúdio ao vivo',
            learners: 'Participe de jams interativos com enquetes, quadros brancos e faíscas em grupos.',
            instructors: 'Conduza sessões guiadas por agenda e remixe formatos sem equilibrar dez ferramentas.'
          },
          contentPlayground: {
            title: 'Parque de conteúdos',
            learners: 'Maratone microaulas, clipes deslizáveis e modelos feitos pelos pares sob demanda.',
            instructors: 'Lance drops, desafios e recursos em minutos com padrões lindos.'
          },
          signalBoosts: {
            title: 'Impulsos de sinal',
            learners: 'Mostre conquistas, receba elogios e sinta a comunidade torcendo por você.',
            instructors: 'Identifique talentos em ascensão e amplifique marcos automaticamente no feed.'
          },
          supportLoop: {
            title: 'Círculo de suporte',
            learners: 'Peça ajuda em tópicos cheios de contexto e receba respostas que ficam.',
            instructors: 'Mantenha as mensagens privadas em ordem enquanto as automações cuidam das dúvidas e follow-ups.'
          },
          growthOps: {
            title: 'Operações de crescimento',
            learners: 'Desbloqueie insígnias, níveis e surpresas conforme continua aparecendo.',
            instructors: 'Acompanhe funis, receita e experimentos com dashboards feitos para learning ops.'
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
      perks: {
        eyebrow: 'Benefit giocosi',
        headline: 'Benefit che mantengono alta l\'energia dell\'apprendimento',
        subhead: 'Boost giocosi pensati per chi apprende con curiosità e per chi insegna sul campo.',
        learnersLabel: 'Per chi apprende',
        instructorsLabel: 'Per chi insegna',
        items: {
          communityMagnetism: {
            title: 'Magnetismo della community',
            learners: 'Entra in stanze accoglienti, prompt e rituali che rendono lo slancio divertente.',
            instructors: 'Crea spazi giocosi e accompagna tutti nel flow senza attriti.'
          },
          liveStudioVibes: {
            title: 'Vibrazioni da studio live',
            learners: 'Partecipa a jam interattive con sondaggi, lavagne e scintille nei breakout.',
            instructors: 'Conduci sessioni guidate dall\'agenda e remixa i formati senza giostrare dieci strumenti.'
          },
          contentPlayground: {
            title: 'Parco giochi dei contenuti',
            learners: 'Divora micro-lezioni, clip scorrevoli e template creati dai pari on demand.',
            instructors: 'Rilascia drop, sfide e risorse in pochi minuti con preset curati.'
          },
          signalBoosts: {
            title: 'Potenti booster di segnale',
            learners: 'Metti in mostra i traguardi, raccogli kudos e senti la community che ti sostiene.',
            instructors: 'Individua talenti emergenti e amplifica automaticamente le tappe nel feed.'
          },
          supportLoop: {
            title: 'Ciclo di supporto',
            learners: 'Chiedi aiuto in thread ricchi di contesto e ricevi risposte che restano.',
            instructors: 'Tieni in ordine i messaggi privati mentre le automazioni gestiscono FAQ e follow-up.'
          },
          growthOps: {
            title: 'Ops di crescita',
            learners: 'Sblocca badge, livelli e sorprese continuando a farti vedere.',
            instructors: 'Monitora funnel, entrate ed esperimenti con dashboard pensate per le learning ops.'
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
      perks: {
        eyebrow: 'Pogodne korzyści',
        headline: 'Korzyści, które podtrzymują energię uczenia',
        subhead: 'Lekkie zastrzyki energii dla ciekawych uczniów i praktycznych instruktorów.',
        learnersLabel: 'Dla uczestników',
        instructorsLabel: 'Dla instruktorów',
        items: {
          communityMagnetism: {
            title: 'Magnetyzm społeczności',
            learners: 'Wskakuj do przytulnych pokoi, promptów i rytuałów, które nadają rozpędu zabawie.',
            instructors: 'Twórz pełne luzu przestrzenie i wprowadzaj wszystkich w flow bez tarcia.'
          },
          liveStudioVibes: {
            title: 'Studyjne wibracje na żywo',
            learners: 'Dołącz do interaktywnych jamów z ankietami, tablicami i błyskami breakout.',
            instructors: 'Prowadź sesje z agendą i miksuj formaty bez żonglowania dziesięcioma narzędziami.'
          },
          contentPlayground: {
            title: 'Plac zabaw treści',
            learners: 'Pochłaniaj mikro lekcje, przewijane klipy i szablony tworzone przez społeczność na żądanie.',
            instructors: 'Wypuszczaj dropy, wyzwania i zasoby w kilka minut dzięki dopracowanym wzorcom.'
          },
          signalBoosts: {
            title: 'Wzmacniacze sygnału',
            learners: 'Pokazuj sukcesy, zbieraj pochwały i czuj doping społeczności.',
            instructors: 'Wypatruj wschodzących gwiazd i automatycznie nagłaśniaj kamienie milowe w feedzie.'
          },
          supportLoop: {
            title: 'Pętla wsparcia',
            learners: 'Proś o pomoc w wątkach pełnych kontekstu i otrzymuj odpowiedzi, które zostają.',
            instructors: 'Trzymaj wiadomości w ryzach, a automatyzacje zajmą się FAQ i follow-upami.'
          },
          growthOps: {
            title: 'Operacje wzrostu',
            learners: 'Odblokowuj odznaki, poziomy i niespodzianki, gdy konsekwentnie się pojawiasz.',
            instructors: 'Śledź lejki, przychody i eksperymenty na pulpitach zaprojektowanych dla learning ops.'
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
      perks: {
        eyebrow: 'मज़ेदार लाभ',
        headline: 'ऐसे लाभ जो सीखने की ऊर्जा बनाए रखें',
        subhead: 'जिज्ञासु शिक्षार्थियों और व्यवहारिक प्रशिक्षकों के लिए तैयार किए गए चंचल बूस्ट।',
        learnersLabel: 'सीखने वालों के लिए',
        instructorsLabel: 'प्रशिक्षकों के लिए',
        items: {
          communityMagnetism: {
            title: 'समुदाय का चुंबकत्व',
            learners: 'आरामदायक कमरों, प्रॉम्प्ट्स और रिवाज़ों में उतरें जो गति को मज़ेदार बना देते हैं।',
            instructors: 'बिना घर्षण के सबको प्रवाह में लाने वाले खिलंदड़े स्थान तैयार करें।'
          },
          liveStudioVibes: {
            title: 'लाइव स्टूडियो वाइब्स',
            learners: 'मतदान, व्हाइटबोर्ड और ब्रेकआउट चमक के साथ इंटरऐक्टिव जैम में शामिल हों।',
            instructors: 'दस टूल सँभाले बिना एजेंडा-चालित सत्र चलाएँ और फ़ॉर्मैट्स को रीमिक्स करें।'
          },
          contentPlayground: {
            title: 'कंटेंट प्लेग्राउंड',
            learners: 'माइक्रो पाठ, स्वाइपेबल क्लिप्स और साथियों द्वारा बनाए टेम्पलेट्स ऑन-डिमांड देखें।',
            instructors: 'सुंदर डिफ़ॉल्ट्स के साथ मिनटों में ड्रॉप्स, चुनौतियाँ और संसाधन जारी करें।'
          },
          signalBoosts: {
            title: 'सिग्नल बूस्ट्स',
            learners: 'अपनी उपलब्धियाँ दिखाएँ, सराहना पाएँ और समुदाय का उत्साह महसूस करें।',
            instructors: 'उभरते सितारों को पहचानें और मील के पत्थरों को फ़ीड में स्वतः उजागर करें।'
          },
          supportLoop: {
            title: 'सपोर्ट लूप',
            learners: 'संदर्भित थ्रेड्स में मदद माँगें और टिकाऊ जवाब पाएँ।',
            instructors: 'स्वचालन को FAQ और फ़ॉलो-अप सँभालने दें, जबकि आप डीएम सुव्यवस्थित रखें।'
          },
          growthOps: {
            title: 'ग्रोथ ऑप्स',
            learners: 'लगातार भाग लेते हुए बैज, लेवल और सरप्राइज़ अनलॉक करें।',
            instructors: 'लर्निंग ऑप्स के लिए बनाए डैशबोर्ड पर फ़नल, राजस्व और प्रयोगों को ट्रैक करें।'
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
      perks: {
        eyebrow: 'مزايا مرحة',
        headline: 'مزايا تُبقي طاقة التعلّم مرتفعة',
        subhead: 'دفعات مرحة صُممت للمتعلمين الفضوليين والمدربين العمليين.',
        learnersLabel: 'للمتعلمين',
        instructorsLabel: 'للمدرسين',
        items: {
          communityMagnetism: {
            title: 'جاذبية المجتمع',
            learners: 'ادخل إلى غرف دافئة ومحفزات وطقوس تجعل الاندفاع ممتعًا.',
            instructors: 'أنشئ مساحات مرحة وادفع الجميع إلى حالة التدفق دون احتكاك.'
          },
          liveStudioVibes: {
            title: 'أجواء الاستوديو المباشر',
            learners: 'انضم إلى جلسات تفاعلية مع استطلاعات ولوحات ومجموعات فرعية تلهم الشرارة.',
            instructors: 'قد جلسات منظمة وغيّر الصيغ دون الاضطرار إلى إدارة عشرة أدوات.'
          },
          contentPlayground: {
            title: 'ملعب المحتوى',
            learners: 'استمتع بدروس مصغرة ومقاطع قابلة للتمرير وقوالب يصنعها الأقران عند الطلب.',
            instructors: 'أطلق المواد والتحديات والموارد في دقائق مع إعدادات جميلة جاهزة.'
          },
          signalBoosts: {
            title: 'تعزيزات الإشارة',
            learners: 'اعرض إنجازاتك، واجمع عبارات التشجيع، واشعر بحماس المجتمع من حولك.',
            instructors: 'اكتشف المواهب الصاعدة ووسّع إبراز المحطات تلقائيًا في الخلاصة.'
          },
          supportLoop: {
            title: 'حلقة الدعم',
            learners: 'اطلب المساعدة داخل نقاشات غنية بالسياق واحصل على ردود تبقى.',
            instructors: 'حافظ على ترتيب الرسائل الخاصة بينما تتولى الأتمتة الأسئلة الشائعة والمتابعات.'
          },
          growthOps: {
            title: 'عمليات النمو',
            learners: 'افتح الشارات والمستويات والمفاجآت كلما واصلت المشاركة.',
            instructors: 'تتبع القمع والإيرادات والتجارب عبر لوحات معلومات مصممة لعمليات التعلّم.'
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
      perks: {
        eyebrow: 'Verspielte Vorteile',
        headline: 'Vorteile, die die Lernenergie hochhalten',
        subhead: 'Verspielte Impulse für neugierige Lernende und pragmatische Lehrende.',
        learnersLabel: 'Für Lernende',
        instructorsLabel: 'Für Lehrende',
        items: {
          communityMagnetism: {
            title: 'Community-Magnetismus',
            learners: 'Tauche in gemütliche Räume, Impulse und Rituale ein, die Schwung in Spaß verwandeln.',
            instructors: 'Erstelle verspielte Bereiche und bring alle mühelos in den Flow.'
          },
          liveStudioVibes: {
            title: 'Live-Studio-Vibes',
            learners: 'Mach bei interaktiven Jams mit Umfragen, Whiteboards und Breakout-Funken mit.',
            instructors: 'Moderiere Agenda-Sessions und remixe Formate, ohne zehn Tools jonglieren zu müssen.'
          },
          contentPlayground: {
            title: 'Content-Spielplatz',
            learners: 'Schau dir Micro-Lektionen, swipebare Clips und Peer-Vorlagen on demand an.',
            instructors: 'Veröffentliche Drops, Challenges und Ressourcen in Minuten mit liebevollen Presets.'
          },
          signalBoosts: {
            title: 'Signal-Booster',
            learners: 'Zeig Erfolge, sammle Kudos und spüre, wie dich die Community anfeuert.',
            instructors: 'Erkenne aufstrebende Talente und verstärke Meilensteine automatisch im Feed.'
          },
          supportLoop: {
            title: 'Support-Schleife',
            learners: 'Bitte in kontextreichen Threads um Hilfe und erhalte Antworten, die bleiben.',
            instructors: 'Halte DMs sortiert, während Automationen FAQs und Follow-ups übernehmen.'
          },
          growthOps: {
            title: 'Growth Ops',
            learners: 'Schalte Abzeichen, Levels und Überraschungen frei, wenn du dranbleibst.',
            instructors: 'Verfolge Funnels, Umsatz und Experimente mit Dashboards für Learning Ops.'
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
      perks: {
        eyebrow: 'Игривые бонусы',
        headline: 'Бонусы, которые держат энергию обучения',
        subhead: 'Небольшие игривые импульсы для любознательных учащихся и практичных наставников.',
        learnersLabel: 'Для учащихся',
        instructorsLabel: 'Для наставников',
        items: {
          communityMagnetism: {
            title: 'Магнетизм сообщества',
            learners: 'Заглядывайте в уютные комнаты, подсказки и ритуалы, чтобы движение вперёд было в радость.',
            instructors: 'Создавайте игривые пространства и мягко вводите всех в состояние потока без трения.'
          },
          liveStudioVibes: {
            title: 'Живые студийные вибрации',
            learners: 'Подключайтесь к интерактивным джемам с опросами, досками и вспышками брейкаутов.',
            instructors: 'Ведите сессии по повестке и миксуйте форматы, не жонглируя десятком инструментов.'
          },
          contentPlayground: {
            title: 'Площадка контента',
            learners: 'Смотрите микроуроки, свайп-клипы и шаблоны от коллег по запросу.',
            instructors: 'Выпускайте дропы, челленджи и ресурсы за минуты благодаря готовым пресетам.'
          },
          signalBoosts: {
            title: 'Усиление сигнала',
            learners: 'Делитесь победами, собирайте поддержку и чувствуйте энергию сообщества.',
            instructors: 'Замечайте восходящие таланты и автоматически подсвечивайте в ленте ключевые этапы.'
          },
          supportLoop: {
            title: 'Цикл поддержки',
            learners: 'Просите помощи в ветках с контекстом и получайте ответы, которые не теряются.',
            instructors: 'Держите личные сообщения в порядке, пока автоматизация обрабатывает FAQ и напоминания.'
          },
          growthOps: {
            title: 'Операции роста',
            learners: 'Открывайте бейджи, уровни и сюрпризы, продолжая появляться.',
            instructors: 'Отслеживайте воронки, доходы и эксперименты на дашбордах, созданных для учебных операций.'
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
