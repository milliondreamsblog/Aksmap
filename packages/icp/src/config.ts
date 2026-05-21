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
      "LangChain",
      "LlamaIndex",
      "RAG",
      "Vector DBs (Qdrant)",
      "PostgreSQL",
      "React",
      "Spring Boot",
      "AWS",
    ],
    portfolioUrls: [
      "https://bawarchie.com",
      "https://app.buildenfra.in",
    ],
    flagshipProjects: [
      {
        name: "Talk2PDF",
        narrative: "ai-heavy",
        oneLineDescription:
          "Agentic document Q&A tool with modular RAG architecture",
        metric: "500+ weekly users",
      },
      {
        name: "Bawarchie",
        narrative: "consumer",
        oneLineDescription:
          "Live QR-based restaurant ordering with AI recommendations and Razorpay payments",
        metric: "Live with real customer traffic",
      },
      {
        name: "BuildEnfra ERP",
        narrative: "b2b-saas",
        oneLineDescription:
          "Internal operations platform for real-estate EPC firm — payroll PDFs, approval workflows, mobile-first",
        metric: "120+ users, $1B+ portfolio under management",
      },
      {
        name: "IEEE Publication",
        narrative: "ai-heavy",
        oneLineDescription:
          "Optimized Traffic Sign Recognition using Transfer Learning, IEEE GIEST 2024",
        metric: "Published, 40% CNN latency reduction",
      },
    ],
  },

  primaryIdentity: "ai-engineer",

  activeGeos: {
    india: true,
    singapore_sea: true,
    usa_remote: false,
    europe_uk: false,
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
        "https://www.dealstreetasia.com/feed/",
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
