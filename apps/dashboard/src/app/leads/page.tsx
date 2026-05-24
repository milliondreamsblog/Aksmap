import { getLeads, getStatusCounts } from "@/lib/queries";
import { LeadTable } from "@/components/lead-list/LeadTable";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status;
  const [leads, counts] = await Promise.all([
    getLeads({
      status: status === "all" ? undefined : status,
      limit: 200,
    }),
    getStatusCounts(),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-muted text-sm">
          Sorted by score · {leads.length} shown
        </p>
      </header>
      <LeadTable leads={leads} counts={counts} currentStatus={status} />
    </div>
  );
}
