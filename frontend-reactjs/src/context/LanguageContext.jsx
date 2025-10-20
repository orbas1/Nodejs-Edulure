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
      courses: {
        kicker: 'Courses adventure',
        title: 'Chart the shared courses adventure',
        subtitle:
          'Follow the journey from discovery through celebration with aligned perks for learners and instructors.',
        cta: 'Explore courses',
        ctaHelper: 'Head straight to the full catalogue and start plotting your next cohort.',
        roles: {
          learners: 'Learners',
          instructors: 'Instructors'
        },
        stages: {
          discover: {
            title: 'Discover',
            headline: 'Match every learner with the right cohort',
            learners: {
              perk1: 'Browse curated cohorts by skill focus',
              perk2: 'Preview syllabi, schedules and outcomes'
            },
            instructors: {
              perk1: 'Spotlight differentiators with rich metadata',
              perk2: 'Publish waitlists and discovery-ready previews'
            }
          },
          enroll: {
            title: 'Enroll',
            headline: 'Make enrollment effortless and transparent',
            learners: {
              perk1: 'Secure seats with flexible payment plans',
              perk2: 'Track onboarding tasks and deadlines'
            },
            instructors: {
              perk1: 'Automate acceptance and welcome flows',
              perk2: 'Gate resources until kickoff'
            }
          },
          coLearn: {
            title: 'Co-learn',
            headline: 'Keep momentum pulsing during the experience',
            learners: {
              perk1: 'Join live studios, async threads and office hours',
              perk2: 'Earn badges for momentum and peer support'
            },
            instructors: {
              perk1: 'Orchestrate sprints with templates and nudges',
              perk2: 'Spot at-risk learners with pulse dashboards'
            }
          },
          celebrate: {
            title: 'Celebrate',
            headline: 'Capture the finish-line energy together',
            learners: {
              perk1: 'Showcase capstone artefacts and reflections',
              perk2: 'Share wins with the cohort and alumni'
            },
            instructors: {
              perk1: 'Issue verifiable certificates in one click',
              perk2: 'Collect testimonials and publish highlights'
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
      courses: {
        kicker: 'Parcours cours',
        title: "Cartographiez l'aventure des cours ensemble",
        subtitle:
          'Suivez le parcours de la découverte à la célébration avec des avantages alignés pour apprenant·es et instructeur·rices.',
        cta: 'Explorer les cours',
        ctaHelper: 'Rejoignez directement le catalogue complet et planifiez votre prochaine cohorte.',
        roles: {
          learners: 'Apprenant·es',
          instructors: 'Instructeur·rices'
        },
        stages: {
          discover: {
            title: 'Découvrir',
            headline: 'Faire matcher chaque profil avec la bonne cohorte',
            learners: {
              perk1: 'Parcourez des cohortes sélectionnées par compétence',
              perk2: 'Prévisualisez programmes, plannings et résultats'
            },
            instructors: {
              perk1: 'Mettez en avant vos différenciateurs avec des métadonnées riches',
              perk2: 'Publiez listes d’attente et aperçus prêts pour la découverte'
            }
          },
          enroll: {
            title: 'S’inscrire',
            headline: "Rendre l'inscription fluide et transparente",
            learners: {
              perk1: 'Réservez des places avec des paiements flexibles',
              perk2: 'Suivez les tâches d’onboarding et les échéances'
            },
            instructors: {
              perk1: 'Automatisez les flux d’acceptation et d’accueil',
              perk2: 'Verrouillez les ressources jusqu’au lancement'
            }
          },
          coLearn: {
            title: 'Co-apprendre',
            headline: "Maintenir l'élan tout au long de l'expérience",
            learners: {
              perk1: 'Rejoignez studios live, fils asynchrones et permanences',
              perk2: 'Gagnez des badges pour le momentum et l’entraide'
            },
            instructors: {
              perk1: 'Orchestrez les sprints avec modèles et relances',
              perk2: 'Identifiez les apprenant·es à risque via des tableaux de bord'
            }
          },
          celebrate: {
            title: 'Célébrer',
            headline: 'Capitaliser sur l’énergie de fin de parcours',
            learners: {
              perk1: 'Mettez en vitrine artefacts et réflexions finales',
              perk2: 'Partagez vos réussites avec la cohorte et les alumnis'
            },
            instructors: {
              perk1: 'Délivrez des certificats vérifiables en un clic',
              perk2: 'Recueillez témoignages et publiez les moments forts'
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
      courses: {
        kicker: 'Travesía de cursos',
        title: 'Mapea la aventura de los cursos en conjunto',
        subtitle:
          'Sigue el recorrido desde el descubrimiento hasta la celebración con beneficios alineados para estudiantes e instructores.',
        cta: 'Explorar cursos',
        ctaHelper: 'Entra directo al catálogo completo y planifica tu próxima cohorte.',
        roles: {
          learners: 'Estudiantes',
          instructors: 'Instructores'
        },
        stages: {
          discover: {
            title: 'Descubrir',
            headline: 'Conecta a cada persona con la cohorte correcta',
            learners: {
              perk1: 'Explora cohortes seleccionadas por enfoque de habilidades',
              perk2: 'Previsualiza programas, cronogramas y resultados'
            },
            instructors: {
              perk1: 'Destaca tus diferenciales con metadatos ricos',
              perk2: 'Publica listas de espera y vistas previas listas para descubrimiento'
            }
          },
          enroll: {
            title: 'Inscribirse',
            headline: 'Haz que la inscripción sea ágil y transparente',
            learners: {
              perk1: 'Asegura cupos con planes de pago flexibles',
              perk2: 'Sigue tareas y plazos de onboarding'
            },
            instructors: {
              perk1: 'Automatiza los flujos de aceptación y bienvenida',
              perk2: 'Restringe recursos hasta el inicio'
            }
          },
          coLearn: {
            title: 'Co-aprender',
            headline: 'Mantén el impulso durante toda la experiencia',
            learners: {
              perk1: 'Únete a estudios en vivo, hilos asíncronos y mentorías',
              perk2: 'Gana insignias por el impulso y el apoyo entre pares'
            },
            instructors: {
              perk1: 'Orquesta sprints con plantillas y recordatorios',
              perk2: 'Detecta estudiantes en riesgo con tableros de pulso'
            }
          },
          celebrate: {
            title: 'Celebrar',
            headline: 'Celebra el cierre con toda la comunidad',
            learners: {
              perk1: 'Muestra artefactos finales y reflexiones',
              perk2: 'Comparte logros con la cohorte y exalumnos'
            },
            instructors: {
              perk1: 'Emite certificados verificables con un clic',
              perk2: 'Recopila testimonios y publica momentos destacados'
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
      courses: {
        kicker: 'Jornada de cursos',
        title: 'Mapeie a jornada dos cursos em conjunto',
        subtitle:
          'Acompanhe o caminho da descoberta à celebração com benefícios alinhados para aprendizes e instrutores.',
        cta: 'Explorar cursos',
        ctaHelper: 'Vá direto ao catálogo completo e planeje sua próxima turma.',
        roles: {
          learners: 'Aprendizes',
          instructors: 'Instrutores'
        },
        stages: {
          discover: {
            title: 'Descobrir',
            headline: 'Conecte cada pessoa à turma certa',
            learners: {
              perk1: 'Explore cohortes curadas por foco de habilidade',
              perk2: 'Visualize ementas, cronogramas e resultados'
            },
            instructors: {
              perk1: 'Destaque diferenciais com metadados ricos',
              perk2: 'Publique listas de espera e prévias prontas para descoberta'
            }
          },
          enroll: {
            title: 'Inscrever-se',
            headline: 'Torne a matrícula simples e transparente',
            learners: {
              perk1: 'Garanta vagas com planos de pagamento flexíveis',
              perk2: 'Acompanhe tarefas e prazos de onboarding'
            },
            instructors: {
              perk1: 'Automatize fluxos de aceitação e boas-vindas',
              perk2: 'Proteja recursos até o início'
            }
          },
          coLearn: {
            title: 'Co-aprender',
            headline: 'Mantenha o ritmo durante toda a experiência',
            learners: {
              perk1: 'Participe de estúdios ao vivo, threads assíncronas e plantões',
              perk2: 'Ganhe badges por ritmo e apoio entre pares'
            },
            instructors: {
              perk1: 'Orquestre sprints com templates e lembretes',
              perk2: 'Detecte aprendizes em risco com dashboards de pulso'
            }
          },
          celebrate: {
            title: 'Celebrar',
            headline: 'Comemore a linha de chegada em conjunto',
            learners: {
              perk1: 'Mostre artefatos finais e reflexões',
              perk2: 'Compartilhe conquistas com a turma e ex-alunos'
            },
            instructors: {
              perk1: 'Emita certificados verificáveis com um clique',
              perk2: 'Colete depoimentos e publique destaques'
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
      courses: {
        kicker: 'Avventura dei corsi',
        title: "Mappa l'avventura dei corsi insieme",
        subtitle:
          'Segui il percorso dalla scoperta alla celebrazione con vantaggi allineati per partecipanti e docenti.',
        cta: 'Esplora i corsi',
        ctaHelper: 'Vai subito al catalogo completo e pianifica la tua prossima coorte.',
        roles: {
          learners: 'Partecipanti',
          instructors: 'Docenti'
        },
        stages: {
          discover: {
            title: 'Scoprire',
            headline: 'Abbina ogni persona alla coorte giusta',
            learners: {
              perk1: 'Esplora coorti curate per focus di competenze',
              perk2: 'Anteprima di programmi, calendari e risultati'
            },
            instructors: {
              perk1: 'Metti in evidenza i tuoi differenziatori con metadati ricchi',
              perk2: 'Pubblica liste d’attesa e anteprime pronte alla scoperta'
            }
          },
          enroll: {
            title: 'Iscriversi',
            headline: "Rendi l'iscrizione semplice e trasparente",
            learners: {
              perk1: 'Blocca un posto con piani di pagamento flessibili',
              perk2: 'Monitora attività e scadenze di onboarding'
            },
            instructors: {
              perk1: 'Automatizza i flussi di accettazione e benvenuto',
              perk2: 'Proteggi le risorse fino al kick-off'
            }
          },
          coLearn: {
            title: 'Co-apprendere',
            headline: "Mantieni slancio lungo tutta l'esperienza",
            learners: {
              perk1: 'Partecipa a studi live, thread asincroni e office hour',
              perk2: 'Guadagna badge per slancio e supporto tra pari'
            },
            instructors: {
              perk1: 'Orchestra sprint con modelli e promemoria',
              perk2: 'Individua learner a rischio con dashboard di andamento'
            }
          },
          celebrate: {
            title: 'Celebrare',
            headline: 'Festeggia insieme il traguardo finale',
            learners: {
              perk1: 'Metti in mostra artefatti finali e riflessioni',
              perk2: 'Condividi i successi con la coorte e gli alumni'
            },
            instructors: {
              perk1: 'Emetti certificati verificabili con un clic',
              perk2: 'Raccogli testimonianze e pubblica i momenti migliori'
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
      courses: {
        kicker: 'Podróż kursowa',
        title: 'Zmapuj wspólną podróż kursu',
        subtitle:
          'Śledź drogę od odkrycia do celebracji z korzyściami dla uczących się i instruktorów.',
        cta: 'Odkryj kursy',
        ctaHelper: 'Przejdź prosto do pełnego katalogu i zaplanuj kolejną kohortę.',
        roles: {
          learners: 'Uczący się',
          instructors: 'Instruktorzy'
        },
        stages: {
          discover: {
            title: 'Odkrywaj',
            headline: 'Dopasuj każdego do właściwej kohorty',
            learners: {
              perk1: 'Przeglądaj wyselekcjonowane kohorty według kompetencji',
              perk2: 'Podglądaj sylabusy, harmonogramy i rezultaty'
            },
            instructors: {
              perk1: 'Wyróżnij przewagi dzięki bogatym metadanym',
              perk2: 'Publikuj listy oczekujących i gotowe podglądy'
            }
          },
          enroll: {
            title: 'Zapisz się',
            headline: 'Uczyń zapisy proste i przejrzyste',
            learners: {
              perk1: 'Zabezpiecz miejsce elastycznymi planami płatności',
              perk2: 'Śledź zadania i terminy onboardingowe'
            },
            instructors: {
              perk1: 'Automatyzuj proces akceptacji i powitania',
              perk2: 'Chroń zasoby do momentu startu'
            }
          },
          coLearn: {
            title: 'Wspólna nauka',
            headline: 'Utrzymuj tempo przez cały cykl',
            learners: {
              perk1: 'Dołączaj do live’ów, wątków asynchronicznych i dyżurów',
              perk2: 'Zdobywaj odznaki za tempo i wsparcie dla innych'
            },
            instructors: {
              perk1: 'Orkiestruj sprinty z szablonami i przypomnieniami',
              perk2: 'Wykrywaj osoby zagrożone w pulpitach pulsów'
            }
          },
          celebrate: {
            title: 'Świętuj',
            headline: 'Świętuj finisz razem',
            learners: {
              perk1: 'Prezentuj projekty końcowe i refleksje',
              perk2: 'Dziel się sukcesami z kohortą i alumnami'
            },
            instructors: {
              perk1: 'Wystawiaj weryfikowalne certyfikaty jednym kliknięciem',
              perk2: 'Zbieraj rekomendacje i publikuj highlighty'
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
      courses: {
        kicker: 'कोर्स यात्रा',
        title: 'कोर्स यात्रा को साथ मिलकर मानचित्रित करें',
        subtitle:
          'खोज से लेकर उत्सव तक की यात्रा को सीखने वालों और प्रशिक्षकों के लिए संरेखित लाभों के साथ ट्रैक करें।',
        cta: 'कोर्स देखें',
        ctaHelper: 'पूरे कैटलॉग पर सीधे जाएँ और अगली कोहोर्ट की योजना बनाएं।',
        roles: {
          learners: 'शिक्षार्थी',
          instructors: 'प्रशिक्षक'
        },
        stages: {
          discover: {
            title: 'खोजें',
            headline: 'हर शिक्षार्थी को सही कोहोर्ट से जोड़ें',
            learners: {
              perk1: 'कौशल फोकस के अनुसार चुनी गई कोहोर्ट ब्राउज़ करें',
              perk2: 'सिलेबस, शेड्यूल और परिणाम पहले ही देखें'
            },
            instructors: {
              perk1: 'समृद्ध मेटाडेटा के साथ अपने अंतर को प्रदर्शित करें',
              perk2: 'वेटलिस्ट और खोज-तैयार पूर्वावलोकन प्रकाशित करें'
            }
          },
          enroll: {
            title: 'नामांकन',
            headline: 'नामांकन को सहज और पारदर्शी बनाएं',
            learners: {
              perk1: 'लचीली भुगतान योजनाओं से सीट सुनिश्चित करें',
              perk2: 'ऑनबोर्डिंग कार्यों और समय सीमा का ट्रैक रखें'
            },
            instructors: {
              perk1: 'स्वीकृति और स्वागत फ्लो को स्वचालित करें',
              perk2: 'किकऑफ तक संसाधनों को सुरक्षित रखें'
            }
          },
          coLearn: {
            title: 'सह-सीखना',
            headline: 'पूरे अनुभव के दौरान गति बनाए रखें',
            learners: {
              perk1: 'लाइव स्टूडियो, असिंक्रोनस थ्रेड्स और ऑफिस आवर्स में शामिल हों',
              perk2: 'गति और साथी समर्थन के लिए बैज अर्जित करें'
            },
            instructors: {
              perk1: 'टेम्पलेट और नज से स्प्रिंट आयोजित करें',
              perk2: 'पल्स डैशबोर्ड से जोखिमग्रस्त शिक्षार्थियों को पहचानें'
            }
          },
          celebrate: {
            title: 'उत्सव मनाएं',
            headline: 'फिनिश लाइन की ऊर्जा को साथ मनाएं',
            learners: {
              perk1: 'कैपस्टोन आर्टिफैक्ट और प्रतिबिंब प्रदर्शित करें',
              perk2: 'कोहोर्ट और पूर्व छात्रों के साथ जीत साझा करें'
            },
            instructors: {
              perk1: 'एक क्लिक में सत्यापित प्रमाणपत्र जारी करें',
              perk2: 'प्रशंसापत्र एकत्र करें और मुख्य झलकियाँ प्रकाशित करें'
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
      courses: {
        kicker: 'رحلة الدورات',
        title: 'ارسموا معًا رحلة الدورات المتكاملة',
        subtitle:
          'تابعوا المسار من الاكتشاف إلى الاحتفال مع مزايا متوازنة للمتعلمين والمدرّسين.',
        cta: 'استكشف الدورات',
        ctaHelper: 'انتقل مباشرة إلى الكتالوج الكامل وخطط للدُفعة التالية.',
        roles: {
          learners: 'المتعلمون',
          instructors: 'المدرّسون'
        },
        stages: {
          discover: {
            title: 'اكتشف',
            headline: 'طابق كل شخص مع الدفعة المناسبة',
            learners: {
              perk1: 'استعرض دفعات منتقاة حسب التركيز المهاري',
              perk2: 'اطلع مسبقًا على المناهج والجداول والنتائج'
            },
            instructors: {
              perk1: 'ابرز نقاط التميّز ببيانات وصفية غنيّة',
              perk2: 'انشر قوائم الانتظار وواجهات الاستعراض الجاهزة'
            }
          },
          enroll: {
            title: 'سجّل',
            headline: 'اجعل التسجيل سلسًا وشفافًا',
            learners: {
              perk1: 'ضمن مقعدًا بخطط دفع مرنة',
              perk2: 'تابع مهام وإرشادات الانضمام'
            },
            instructors: {
              perk1: 'أتمت تدفقات القبول والترحيب',
              perk2: 'احمِ الموارد حتى موعد الانطلاق'
            }
          },
          coLearn: {
            title: 'تعلّم جماعيًا',
            headline: 'حافظ على الزخم طوال التجربة',
            learners: {
              perk1: 'انضم إلى الاستوديوهات المباشرة والخيوط غير المتزامنة وساعات المكتب',
              perk2: 'اكسب شارات للزخم ولدعم الأقران'
            },
            instructors: {
              perk1: 'نسّق السبرنتات بالقوالب والتنبيهات',
              perk2: 'التقط المتعلمين المعرضين للخطر عبر لوحات النبض'
            }
          },
          celebrate: {
            title: 'احتفل',
            headline: 'احتفلوا بالطاقة عند خط النهاية معًا',
            learners: {
              perk1: 'اعرض نتاج المشاريع النهائية والتأملات',
              perk2: 'شارك الإنجازات مع الدفعة والخريجين'
            },
            instructors: {
              perk1: 'أصدر شهادات موثوقة بضغطة واحدة',
              perk2: 'اجمع الشهادات وانشر أبرز اللحظات'
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
      courses: {
        kicker: 'Kursreise',
        title: 'Gemeinsam die Kursreise kartieren',
        subtitle:
          'Verfolge den Weg von der Entdeckung bis zur Feier mit abgestimmten Vorteilen für Lernende und Lehrende.',
        cta: 'Kurse entdecken',
        ctaHelper: 'Spring direkt in den vollständigen Katalog und plane deine nächste Kohorte.',
        roles: {
          learners: 'Lernende',
          instructors: 'Lehrende'
        },
        stages: {
          discover: {
            title: 'Entdecken',
            headline: 'Finde für jede Person die passende Kohorte',
            learners: {
              perk1: 'Durchstöbere kuratierte Kohorten nach Skill-Schwerpunkten',
              perk2: 'Blicke vorab in Lehrpläne, Zeitpläne und Ergebnisse'
            },
            instructors: {
              perk1: 'Rücke Alleinstellungsmerkmale mit reichhaltigen Metadaten ins Rampenlicht',
              perk2: 'Veröffentliche Wartelisten und entdeckungsbereite Previews'
            }
          },
          enroll: {
            title: 'Einschreiben',
            headline: 'Mache die Einschreibung einfach und transparent',
            learners: {
              perk1: 'Sichere dir Plätze mit flexiblen Zahlungsplänen',
              perk2: 'Behalte Onboarding-Aufgaben und Deadlines im Blick'
            },
            instructors: {
              perk1: 'Automatisiere Aufnahme- und Willkommensflows',
              perk2: 'Schütze Ressourcen bis zum Kick-off'
            }
          },
          coLearn: {
            title: 'Gemeinsam lernen',
            headline: 'Halte den Schwung während der gesamten Erfahrung',
            learners: {
              perk1: 'Nimm an Live-Studios, asynchronen Threads und Sprechstunden teil',
              perk2: 'Verdiene Abzeichen für Momentum und Peer-Support'
            },
            instructors: {
              perk1: 'Orchestriere Sprints mit Vorlagen und Nudges',
              perk2: 'Erkenne gefährdete Lernende mit Puls-Dashboards'
            }
          },
          celebrate: {
            title: 'Feiern',
            headline: 'Feiert gemeinsam den Zieleinlauf',
            learners: {
              perk1: 'Präsentiere Abschlussartefakte und Reflexionen',
              perk2: 'Teile Erfolge mit der Kohorte und Alumni'
            },
            instructors: {
              perk1: 'Stelle verifizierbare Zertifikate mit einem Klick aus',
              perk2: 'Sammle Testimonials und veröffentliche Highlights'
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
      courses: {
        kicker: 'Путешествие по курсам',
        title: 'Спланируйте совместное путешествие по курсам',
        subtitle:
          'Проследите путь от знакомства до празднования с выверенными выгодами для учащихся и преподавателей.',
        cta: 'Исследовать курсы',
        ctaHelper: 'Перейдите прямо к полному каталогу и запланируйте следующую когорту.',
        roles: {
          learners: 'Учащиеся',
          instructors: 'Преподаватели'
        },
        stages: {
          discover: {
            title: 'Открыть',
            headline: 'Подберите каждому подходящую когорту',
            learners: {
              perk1: 'Изучайте подобранные когорты по навыкам',
              perk2: 'Смотрите программы, расписания и результаты заранее'
            },
            instructors: {
              perk1: 'Выделяйте преимущества с помощью богатых метаданных',
              perk2: 'Публикуйте листы ожидания и готовые превью'
            }
          },
          enroll: {
            title: 'Записаться',
            headline: 'Сделайте запись простой и прозрачной',
            learners: {
              perk1: 'Закрепляйте места с гибкими планами оплаты',
              perk2: 'Отслеживайте задачи и сроки онбординга'
            },
            instructors: {
              perk1: 'Автоматизируйте процессы принятия и приветствия',
              perk2: 'Ограничивайте доступ к ресурсам до старта'
            }
          },
          coLearn: {
            title: 'Совместно учиться',
            headline: 'Поддерживайте темп на протяжении всей программы',
            learners: {
              perk1: 'Присоединяйтесь к живым студиям, асинхронным веткам и офисным часам',
              perk2: 'Зарабатывайте бейджи за прогресс и поддержку коллег'
            },
            instructors: {
              perk1: 'Организуйте спринты с шаблонами и напоминаниями',
              perk2: 'Отслеживайте риски через дашборды пульса'
            }
          },
          celebrate: {
            title: 'Отпраздновать',
            headline: 'Празднуйте финиш вместе',
            learners: {
              perk1: 'Показывайте итоговые артефакты и рефлексии',
              perk2: 'Делитесь победами с когортой и выпускниками'
            },
            instructors: {
              perk1: 'Выдавайте проверяемые сертификаты одним кликом',
              perk2: 'Собирайте отзывы и публикуйте лучшие моменты'
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
