import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  Sparkles,
  Send,
  MessageCircle,
  PlusCircle,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { getStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

// The pipeline, in order. Each stage teaches the user what it means and what to
// do next — this is the spine of the whole product's mental model.
const PIPELINE: {
  status: string;
  label: string;
  meaning: string;
  todo: string;
}[] = [
  {
    status: "raw",
    label: "New",
    meaning: "Just scraped from YC, HN, careers pages & feeds.",
    todo: "Nothing yet — enrichment runs automatically.",
  },
  {
    status: "enriched",
    label: "Enriched",
    meaning: "Company details & contacts filled in.",
    todo: "Waiting to be scored.",
  },
  {
    status: "scored",
    label: "Scored",
    meaning: "Ranked against your ICP (fit 0–100).",
    todo: "Review and decide who's worth contacting.",
  },
  {
    status: "queued",
    label: "Ready to send",
    meaning: "You marked these as worth reaching out to.",
    todo: "Write & send your outreach.",
  },
  {
    status: "sent",
    label: "Sent",
    meaning: "Outreach is out the door.",
    todo: "Give it a few days, then follow up.",
  },
  {
    status: "replied",
    label: "Replied",
    meaning: "They responded.",
    todo: "Reply fast — momentum matters.",
  },
];

export default async function Home() {
  const stats = await getStats();
  const countFor = (s: string) =>
    stats.byStatus.find((r) => r.status === s)?.count ?? 0;
  const total = stats.byStatus.reduce((a, s) => a + s.count, 0);

  const nextAction = pickNextAction(countFor);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-text">Today</h1>
        <p className="text-muted text-sm mt-1">
          {total === 0
            ? "Let's get your first leads in."
            : `${total} leads in your pipeline · ${stats.totals?.companies ?? 0} companies`}
        </p>
      </header>

      {/* Hero: the single most important thing to do right now */}
      <NextActionCard action={nextAction} />

      {/* Pipeline: what each stage means and what to do there */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-muted font-medium">
          Your pipeline
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE.map((stage) => (
            <StageCard
              key={stage.status}
              stage={stage}
              count={countFor(stage.status)}
            />
          ))}
        </div>
      </section>

      {/* How it works + quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <HowItWorks />
        <QuickActions />
      </div>
    </div>
  );
}

type Action = {
  tone: "urgent" | "go" | "wait" | "empty";
  icon: typeof Send;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
};

function pickNextAction(countFor: (s: string) => number): Action {
  const replied = countFor("replied");
  const queued = countFor("queued");
  const scored = countFor("scored");
  const enriched = countFor("enriched");
  const raw = countFor("raw");

  if (replied > 0)
    return {
      tone: "urgent",
      icon: MessageCircle,
      title: `${replied} repl${replied === 1 ? "y" : "ies"} waiting`,
      body: "Someone responded to your outreach. Reply quickly while you're top of mind.",
      ctaLabel: "Respond now",
      href: "/leads?status=replied",
    };
  if (queued > 0)
    return {
      tone: "go",
      icon: Send,
      title: `${queued} lead${queued === 1 ? "" : "s"} ready to contact`,
      body: "You've already decided these are worth it. Time to write and send.",
      ctaLabel: "Send outreach",
      href: "/leads?status=queued",
    };
  if (scored > 0)
    return {
      tone: "go",
      icon: Sparkles,
      title: `${scored} scored lead${scored === 1 ? "" : "s"} to review`,
      body: "Fresh leads are ranked against your ICP. Open the strongest and queue the keepers.",
      ctaLabel: "Review leads",
      href: "/leads?status=scored",
    };
  if (enriched > 0)
    return {
      tone: "wait",
      icon: Sparkles,
      title: `${enriched} lead${enriched === 1 ? "" : "s"} enriched`,
      body: "These are enriched and will be scored shortly. Take a look if you're curious.",
      ctaLabel: "Browse enriched",
      href: "/leads?status=enriched",
    };
  if (raw > 0)
    return {
      tone: "wait",
      icon: Zap,
      title: `${raw} new lead${raw === 1 ? "" : "s"} coming in`,
      body: "Freshly scraped. Enrichment and scoring run automatically — check back soon.",
      ctaLabel: "See new leads",
      href: "/leads?status=raw",
    };
  return {
    tone: "empty",
    icon: PlusCircle,
    title: "No leads yet",
    body: "Paste a hiring post to add one instantly, or trigger a scraper to pull from YC, HackerNews & careers pages.",
    ctaLabel: "Add your first lead",
    href: "/quick-add",
  };
}

const TONE: Record<Action["tone"], string> = {
  urgent: "border-success/50 bg-success/10",
  go: "border-accent/50 bg-accent/10",
  wait: "border-border bg-surface",
  empty: "border-accent/40 bg-accent/5",
};

function NextActionCard({ action }: { action: Action }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className={`group block rounded-xl border p-6 transition-colors hover:border-accent ${TONE[action.tone]}`}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-bg/40 p-2.5 text-accent">
          <Icon size={22} />
        </div>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wide text-muted font-medium">
            Next best action
          </div>
          <h2 className="text-lg font-semibold text-text mt-0.5">
            {action.title}
          </h2>
          <p className="text-muted text-sm mt-1 max-w-xl">{action.body}</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-accent self-center whitespace-nowrap">
          {action.ctaLabel}
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

function StageCard({
  stage,
  count,
}: {
  stage: (typeof PIPELINE)[number];
  count: number;
}) {
  const dim = count === 0;
  return (
    <Link
      href={`/leads?status=${stage.status}`}
      className={`group flex flex-col rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent ${
        dim ? "opacity-60 hover:opacity-100" : ""
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-text">{stage.label}</span>
        <span className="font-mono text-lg text-text">{count}</span>
      </div>
      <p className="text-[11px] text-muted mt-1 leading-snug">{stage.meaning}</p>
      <p className="text-[11px] text-accent/80 mt-2 leading-snug">
        {stage.todo}
      </p>
    </Link>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Zap, text: "Scrapers pull hiring signals from YC, HN, careers pages & funding feeds." },
    { icon: Sparkles, text: "Each lead is enriched with company info, then scored against your ICP." },
    { icon: CheckCircle2, text: "You review the top-ranked leads and queue the ones worth a message." },
    { icon: Send, text: "Send outreach, track replies, and follow up — all from the Leads view." },
  ];
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-xs uppercase tracking-wide text-muted mb-3 font-medium">
        How Job Hunter works
      </h3>
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg text-[10px] font-mono text-muted">
                {i + 1}
              </span>
              <Icon size={15} className="mt-0.5 shrink-0 text-muted" />
              <span className="text-muted leading-snug">{s.text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function QuickActions() {
  const actions = [
    {
      href: "/quick-add",
      icon: PlusCircle,
      title: "Quick Add",
      desc: "Paste a hiring post → scored lead + draft.",
    },
    {
      href: "/leads",
      icon: Inbox,
      title: "Browse all leads",
      desc: "The full table, sorted by fit score.",
    },
    {
      href: "http://localhost:8288",
      icon: Zap,
      title: "Run scrapers",
      desc: "Trigger a scrape from the Inngest dashboard.",
      external: true,
    },
  ];
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-xs uppercase tracking-wide text-muted mb-3 font-medium">
        Quick actions
      </h3>
      <div className="space-y-1.5">
        {actions.map((a) => {
          const Icon = a.icon;
          const inner = (
            <>
              <Icon size={16} className="shrink-0 text-muted" />
              <span className="flex-1">
                <span className="block text-sm text-text">{a.title}</span>
                <span className="block text-xs text-muted">{a.desc}</span>
              </span>
              <ArrowRight size={14} className="shrink-0 text-muted" />
            </>
          );
          return a.external ? (
            <a
              key={a.href}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-border/30 transition-colors"
            >
              {inner}
            </a>
          ) : (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-border/30 transition-colors"
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
