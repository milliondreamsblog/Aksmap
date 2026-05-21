import { activeFundingSources, config } from "@job-hunter/icp";
import { scrapeYc, scrapeRssFeed, type ScrapedLead } from "../index.js";

function logLeads(source: string, leads: ScrapedLead[]) {
  console.log(`\n${source} — ${leads.length} leads`);
  const preview = leads.slice(0, 5);
  for (const lead of preview) {
    const name = lead.company.name.padEnd(30);
    const domain = (lead.company.domain ?? "no-domain").padEnd(30);
    const geo = lead.company.geo ?? "";
    console.log(`  - ${name} ${domain} ${geo}`);
  }
  if (leads.length > 5) console.log(`  ... and ${leads.length - 5} more`);
}

async function main() {
  const active = Object.entries(config.activeGeos)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");
  console.log("Active geos:", active);

  console.log("\nScraping YC...");
  try {
    const yc = await scrapeYc();
    logLeads(yc.source, yc.leads);
    if (yc.errors.length) console.log(`  ${yc.errors.length} soft errors`);
  } catch (err) {
    console.error(
      "  YC scrape failed:",
      err instanceof Error ? err.message : err,
    );
  }

  console.log("\nScraping RSS funding feeds...");
  for (const feedUrl of activeFundingSources()) {
    try {
      const result = await scrapeRssFeed(feedUrl);
      logLeads(result.source, result.leads);
      if (result.errors.length)
        console.log(`  ${result.errors.length} soft errors`);
    } catch (err) {
      console.error(
        `  ${feedUrl}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  console.log("\nSmoke test complete");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
