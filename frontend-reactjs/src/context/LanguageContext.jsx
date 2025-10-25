import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { buildTestimonialDictionary } from '../data/marketing/testimonials.js';

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
        headline: 'Learn, teach, and build together.',
        subhead:
          'Swap playbooks, host live jams, and grow with peers on Edulure.',
        title: 'Learn, teach, and build together.',
        description:
          'Swap playbooks, host live jams, and turn shared knowledge into momentum with peers who cheer you on.',
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
        tagline: 'Resource vault',
        title: 'Playbooks built for modern learning operators',
        subtitle:
          'Dive into living handbooks packed with launch templates, monetisation tips, and remixable rituals.',
        meta: 'Fresh drops monthly',
        carouselLabel: 'Featured Edulure e-books',
        stickers: {
          new: 'Just launched',
          trending: 'Trending now',
          remixable: 'Remix-friendly'
        },
        cards: {
          builderNotebook: {
            alt: 'Cover art for the Builder Notebook e-book',
            tag: 'Operations',
            title: "Builder's notebook",
            description:
              'Launch rituals, onboarding flows, and retention loops with ready-to-run templates.'
          },
          communityCookbook: {
            alt: 'Cover art for the Community Cookbook e-book',
            tag: 'Community',
            title: 'Community cookbook',
            description:
              'Collect facilitation recipes from top operators and remix them into your own gatherings.'
          },
          remixAtlas: {
            alt: 'Cover art for the Remix Atlas e-book',
            tag: 'Playbooks',
            title: 'Remix atlas',
            description:
              'Bundle swipeable worksheets, prompts, and agenda riffs to accelerate your next cohort.'
          }
        },
        panels: {
          readers: {
            label: 'For readers',
            title: 'Stay in sync with your crew',
            bullets: {
              discovery: 'Follow curated drops tailored to your active communities.',
              sync: 'Save highlights that sync across desktop and mobile readers.',
              community: 'Share notes, questions, and riffs directly with collaborators.'
            }
          },
          creators: {
            label: 'For creators',
            title: 'Ship knowledge faster',
            bullets: {
              publish: 'Publish interactive handbooks with audio, video, and checklists.',
              analytics: 'Track opens, completions, and remix requests from one dashboard.',
              revenue: 'Bundle e-books with cohorts and keep 95%+ of every sale.'
            }
          }
        }
      },
      featureGrid: {
        eyebrow: 'Workflow shortcuts',
        headline: 'Move from idea to launch without detours',
        categories: {
          programs: {
            title: 'Programs',
            helper: 'Build cohorts fast',
            actions: {
              cohort: 'New Cohort',
              library: 'Module Library',
              studio: 'Lesson Studio'
            }
          },
          engagement: {
            title: 'Engagement',
            helper: 'Keep rooms active',
            actions: {
              rooms: 'Live Rooms',
              calendar: 'Calendar',
              inbox: 'Inbox'
            }
          },
          revenue: {
            title: 'Revenue',
            helper: 'Track and grow',
            actions: {
              pricing: 'Pricing',
              affiliate: 'Affiliate',
              ads: 'Ads'
            }
          }
        }
      },
      testimonials: {
        heading: 'Trusted by ambitious learning operators',
        items: buildTestimonialDictionary()
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
        },
        instructorPill: "I'm an instructor",
        illustrationAlt: 'Collage of instructors and learners collaborating'
      },
      membership: {
        pretitle: 'Fee snapshot',
        title: 'Flat fees, zero monthly costs',
        subtitle:
          'Operate on transparent usage-based pricing designed for modern learning businesses.',
        defaults: {
          feature: 'Transparent fee highlight'
        },
        plans: {
          communityTutor: {
            title: 'Communities & tutoring',
            tagline: 'Applied to memberships, subscriptions, and 1:1 bookings.',
            price: '2.5% fee',
            features: [
              '2.5% platform fee on community subscriptions and tutor bookings.',
              'Zero minimum fees so every transaction settles in full.',
              'Creators control payout schedules and workforce compensation.'
            ],
            note: 'Keep 97.5% of revenue while Edulure handles compliance and ledgers.'
          },
          catalogue: {
            title: 'Digital catalogues',
            tagline: 'Courses and e-book sales with built-in delivery.',
            price: '5% fee',
            features: [
              '5% platform fee on courses and e-book sales across the marketplace.',
              'Non-custodial settlement ensures funds move directly to you.',
              'Share up to 25% of fees with affiliates automatically.'
            ],
            note: 'Perfect for asynchronous learning drops and evergreen content.'
          },
          liveDonations: {
            title: 'Live donations & tips',
            tagline: 'Supporters boost your live events in real time.',
            price: '10% fee',
            features: [
              '10% platform fee on community live stream donations and tips.',
              'No minimum fees or extra payout delays.',
              'Built-in compliance narrative keeps sponsorships audit-ready.'
            ],
            note: 'Amplify events with transparent supporter flows and audit trails.'
          }
        },
        cta: 'Launch your workspace',
        disclaimer:
          'Platform fees include a 25% affiliate share and non-custodial settlement.'
      },
      faq: {
        pretitle: 'FAQ',
        title: 'Wondering how Edulure fits your flow?',
        subtitle: 'Tap on a bubble to see how other creators stitch Edulure into their day-to-day magic.',
        items: {
          orbit: {
            question: 'How quickly can I orbit into a live learning space?',
            answer: 'Spin up a fresh circle in under ten minutes. Pick a template, invite your crew, and Edulure auto-syncs invites, reminders, and discussion prompts.'
          },
          cohorts: {
            question: 'Can I run asynchronous and live cohorts together?',
            answer: 'Yes! Thread pre-recorded drops, async quests, and live jams into one rhythm. Learners see a single timeline that adapts to their pace.'
          },
          pricing: {
            question: 'What happens if I want to shift plans later?',
            answer: 'You can slide between tiers anytime. Billing adjusts on the next cycle and your spaces, analytics, and automations stay intact.'
          },
          support: {
            question: 'Do you offer onboarding support for teams?',
            answer: 'Community Captains receive white-glove onboarding, while every plan includes live office hours, tutorial vaults, and a buzzing peer support lounge.'
          }
        },
        mascotAlt: 'Playful mascot waving hello',
        mascotCaption: 'Our cosmic courier keeps track of your questions and beams answers back at light speed.'
      },
      closingCta: {
        pretitle: 'Ready when you are',
        title: 'Let the sunset spark your next learning orbit',
        subtitle: 'Lean into the glow—whether you are building your first circle or guiding a galaxy of learners, Edulure is ready.',
        ctaLearners: 'Start as a learner',
        ctaInstructors: 'Launch as an instructor',
        footer: 'Dual launchpads, one vibrant universe.'
      },
      preview: {
        title: 'See what’s waiting inside the Edulure clubhouse',
        subtitle:
          'Toggle between community rooms, curriculum, and live ops to feel the flow before you sign in.',
        helper: 'Spotlights from this week’s launches',
        tablistLabel: 'Preview categories',
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
            highlightOne: 'Listes de contrôle d’intégration fournisseur',
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
      featureGrid: {
        eyebrow: 'Workflow-Abkürzungen',
        headline: 'Von der Idee zum Launch ohne Umwege',
        categories: {
          programs: {
            title: 'Programme',
            helper: 'Cohorts schnell aufbauen',
            actions: {
              cohort: 'Neue Kohorte',
              library: 'Modulbibliothek',
              studio: 'Lektionsstudio'
            }
          },
          engagement: {
            title: 'Engagement',
            helper: 'Räume aktiv halten',
            actions: {
              rooms: 'Live-Räume',
              calendar: 'Kalender',
              inbox: 'Posteingang'
            }
          },
          revenue: {
            title: 'Umsatz',
            helper: 'Verfolgen und wachsen',
            actions: {
              pricing: 'Preise',
              affiliate: 'Partnerprogramm',
              ads: 'Anzeigen'
            }
          }
        }
      },
      testimonials: {
        heading: 'Vertraut von ambitionierten Learning-Operator:innen',
        items: {
          lena: {
            quote: 'Wir haben unsere Kohorte in zwei Wochen mit den Templates und Live-Ops-Tools gestartet.',
            name: 'Lena Ortiz',
            role: 'Gründerin, CohortCraft'
          },
          noah: {
            quote: 'Abrechnung, Terminplanung und Community-Räume leben endlich in einem Workflow.',
            name: 'Noah Winter',
            role: 'Direktor, Global Learning Lab'
          }
        }
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
            highlightOne: 'Checklisten für das Provider-Onboarding',
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
