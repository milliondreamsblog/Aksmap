import type { Geo, IcpConfig, NarrativeAngle } from "./types.js";

export const config: IcpConfig = {
  candidate: {
    fullName: "Akshat Darshi",
    email: "akshatsan23@gmail.com",
    graduationYear: 2026,
    university: "UIET, CSJM University (CS with AI specialization)",
    primarySkills: [
      "TypeScript",
      "Next.js",
      "Node.js",
      "Python",
      "Go",
      "React Native",
      "LangChain",
      "RAG",
      "Vector DBs (MongoDB Atlas, Qdrant)",
      "PostgreSQL",
      "MongoDB",
      "Claude SDK",
      "OpenAI SDK",
      "Docker",
      "AWS",
    ],
    portfolioUrls: [
      "https://bawarchie.com",
      "https://app.buildenfra.in",
      "https://hr.buildenfra.in",
    ],
    flagshipProjects: [
      {
        name: "BuildEnfra ERP + HRMS",
        narrative: "b2b-saas",
        oneLineDescription:
          "Integrated construction-ops ERP and HRMS serving 17,000+ workforce records, 1,000+ ERP users across 10+ sites managing $2B+ in project value",
        metric: "17K+ records, 1K+ users, $2B+ portfolio, 700+ payroll PDFs/mo",
      },
      {
        name: "Bawarchie",
        narrative: "consumer",
        oneLineDescription:
          "Multi-tenant SaaS dine-in platform with cross-restaurant taste graph using 768-d Gemini embeddings + MongoDB Atlas Vector Search, RAG-grounded AI waiter, HMAC-signed Razorpay refunds",
        metric: "3 pilot restaurants, 27-diner field study, live payments",
      },
      {
        name: "Talk2PDF",
        narrative: "ai-heavy",
        oneLineDescription:
          "Agentic document Q&A with modular retrieval layer supporting multiple LLMs and vector stores",
        metric: "500+ weekly users, 10+ shipped AI products total",
      },
      {
        name: "RoboRumble 3.0",
        narrative: "consumer",
        oneLineDescription:
          "Solo-built tech-event platform with live team lobbies, real-time rooms, and Razorpay payments",
        metric: "30K+ page visits, 1K+ paid registrations, INR 1L+ processed",
      },
      {
        name: "IEEE Publication",
        narrative: "ai-heavy",
        oneLineDescription:
          "Optimized Traffic Sign Recognition using Transfer Learning, IEEE GIEST 2024",
        metric: "Published, ~40% CNN inference latency reduction",
      },
    ],
  },

  primaryIdentity: "ai-engineer",

  activeGeos: {
    india: true,
    singapore_sea: true,
    usa_remote: true,
    europe_uk: true,
    japan_korea: false,
  },

  geoConfig: {
    india: {
      displayName: "India",
      timezone: "Asia/Kolkata",
      language: "en-IN",
      visaSignalRequired: false,
      fundingSources: [
        "https://inc42.com/feed/",
        "https://yourstory.com/feed",
        "https://indianstartupnews.com/rss",
        "https://startuptalky.com/feed/",
      ],
    },
    singapore_sea: {
      displayName: "Singapore & SEA",
      timezone: "Asia/Singapore",
      language: "en-SG",
      visaSignalRequired: true,
      fundingSources: [
        "https://e27.co/feed/",
        "https://techcrunch.com/tag/asia/feed/",
        "https://vulcanpost.com/feed/",
      ],
    },
    usa_remote: {
      displayName: "USA (remote-friendly)",
      timezone: "America/Los_Angeles",
      language: "en",
      visaSignalRequired: true,
      fundingSources: ["https://techcrunch.com/feed/"],
    },
    europe_uk: {
      displayName: "UK & Europe",
      timezone: "Europe/London",
      language: "en-GB",
      visaSignalRequired: true,
      fundingSources: ["https://sifted.eu/feed", "https://tech.eu/feed/"],
    },
    japan_korea: {
      displayName: "Japan & Korea",
      timezone: "Asia/Tokyo",
      language: "en",
      visaSignalRequired: true,
      fundingSources: [],
    },
  },

  scoringWeights: {
    recentlyFunded: 0.2,
    stackMatch: 0.15,
    hiringSignal: 0.18,
    smallTeam: 0.1,
    juniorFriendly: 0.12,
    geoMatch: 0.08,
    aiCompany: 0.1,
    remoteFriendly: 0.07,
  },

  hardFilters: {
    minHeadcount: null,
    maxHeadcount: 500,
    excludeIndustries: ["gambling", "adult"],
    requireFundedOrRevenue: false,
  },

  roleWeights: {
    "ai-ml": 1.0,
    founding: 0.95,
    backend: 0.7,
    fullstack: 0.65,
    platform: 0.55,
    frontend: 0.4,
  },

  outreach: {
    emailsPerDay: 25,
    linkedinDmsPerDay: 15,
    twitterDmsPerDay: 5,
    minScoreToQueue: 60,
    warmupDays: 14,
  },
};

export const activeGeosList = (): Geo[] =>
  (Object.entries(config.activeGeos) as Array<[Geo, boolean]>)
    .filter(([, active]) => active)
    .map(([geo]) => geo);

export const activeFundingSources = (): string[] =>
  activeGeosList().flatMap((geo) => config.geoConfig[geo].fundingSources);

export const isActiveGeo = (geo: Geo): boolean => config.activeGeos[geo];

export const getProjectsByNarrative = (narrative: NarrativeAngle) =>
  config.candidate.flagshipProjects.filter((p) => p.narrative === narrative);
