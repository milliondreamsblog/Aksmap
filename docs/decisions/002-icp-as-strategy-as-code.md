# ADR 002 — ICP as strategy-as-code

**Status:** accepted (Prompt 1, 2026-05-21)

## Context

A job-search automation system needs to know:

- Who the candidate is (background, skills, projects, achievements)
- What kinds of companies to target (geo, stage, headcount, industry, AI vs non-AI)
- How to weigh signals (recently-funded company beats randomly-pulled company; AI/ML role beats frontend role)
- How to position the candidate to each company (lead with the AI projects vs the B2B projects vs the consumer project)
- Operating limits (don't exceed 25 emails/day, don't queue leads scoring below 60)

Where does this knowledge live?

**Option A — In your head.** The traditional approach. Re-explain to yourself each time you write a cold message. Pros: zero infrastructure. Cons: doesn't scale, drifts week to week, can't be tuned systematically.

**Option B — In a Notion doc or spreadsheet.** Better than your head. Pros: written down, reviewable. Cons: not machine-readable, no enforcement, easy to ignore.

**Option C — Embedded inside each component.** Scraper hardcodes the geos. Scorer hardcodes the weights. LLM prompt hardcodes the projects. Pros: simple per component. Cons: changes require touching every package; high risk of drift between components.

**Option D — As a typed config package every component imports.** Strategy lives in one file; every consumer reads it.

## Decision

**Option D.** Build a shared package `@job-hunter/icp` that exports a strongly-typed `IcpConfig` value. Every other package depends on it and reads from it at runtime.

## Why

1. **Single source of truth.** When the candidate decides to flip on USA-remote targeting, it's one edit (`activeGeos.usa_remote = true`) and the change ripples to scrapers, scorer, and LLM prompts on the next run. No coordinated multi-package change.

2. **Reviewable as a diff.** Strategy changes show up in `git log`. You can see exactly when you raised your daily email cap or added Sifted as a Europe funding source.

3. **Testable.** "Given this ICP, this lead should score 78." That's a unit test. Strategy in your head can't be tested.

4. **Type-safety as enforcement.** If the scorer expects `scoringWeights.aiCompany` and you delete that field, TypeScript errors before you ship. With a Notion doc, you'd ship the typo.

5. **A/B testable.** Want to test "what if I weight founding-engineer roles higher"? Fork the config, run both, compare reply rates. Strategy-as-code makes this trivial; strategy-in-your-head makes it impossible.

6. **LLM context.** The LLM that drafts messages reads from `config.candidate.flagshipProjects` and `getProjectsByNarrative()`. The same data structure that drives the scorer also drives the message generator. One change ripples to both.

## Structure

```
IcpConfig
├── candidate              who I am
│   ├── fullName, email, graduationYear, university
│   ├── primarySkills      what to mention in messages
│   └── flagshipProjects   tagged by narrative (ai-heavy / b2b-saas / consumer)
├── primaryIdentity        ai-engineer (drives default LLM framing)
├── activeGeos             which markets to scrape
├── geoConfig              per-geo: timezone, language, RSS sources, visa
├── scoringWeights         8 factors summing to 1.0
├── hardFilters            kill switches (no gambling, max 500 employees, etc.)
├── roleWeights            multiplier per role type
└── outreach               daily caps + score threshold
```

## Trade-offs

- **Config churn during early development.** As you learn what works, weights will change frequently. Mitigated by: it's all in one file, changes are obvious in diffs, no migrations needed.
- **Tempting to put too much in.** Resist the urge to encode every nuance. The ICP is for cross-cutting strategy — per-lead reasoning lives in the LLM, not in config.
- **Doesn't capture intuition.** "I really want to work at Anthropic" can't be expressed as weights. Solution: maintain a `dreamCompanies: string[]` list separately if needed (not in scope yet).

## How to apply this

- **Editing strategy** → edit `packages/icp/src/config.ts`. Commit with a message that says *why* the weight changed.
- **Adding a new factor** (e.g. "open-source-friendly") → add to `ScoringWeights` interface, update `scoringWeights` value, update the scorer to use it. TypeScript will tell you everywhere that needs to change.
- **Reading strategy from a downstream package** → import from `@job-hunter/icp`, read what you need. Never duplicate values.

## References

- See [Prompt 1 doc](../prompts/01-monorepo-and-icp.md) for the package implementation
- The original term "Ideal Customer Profile" comes from B2B sales playbooks; here it's inverted — *companies that match the candidate*. Same idea: a structured target definition that drives everything.
