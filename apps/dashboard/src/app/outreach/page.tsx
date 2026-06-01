import { getSentOutreach } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { OutreachTable } from "@/components/outreach/OutreachTable";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const rows = await getSentOutreach();
  const sent = rows.filter((r) => r.status === "sent").length;
  const replied = rows.filter((r) => r.leadStatus === "replied").length;
  const failed = rows.filter(
    (r) => r.status === "failed" || r.status === "bounced",
  ).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Outreach</h1>
        <p className="text-muted text-sm">
          All sent emails · {rows.length} total · click a row to read it
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Card title="Sent">
          <div className="text-3xl font-mono">{sent}</div>
        </Card>
        <Card title="Replied">
          <div className="text-3xl font-mono text-green-400">{replied}</div>
        </Card>
        <Card title="Failed / bounced">
          <div className="text-3xl font-mono text-red-400">{failed}</div>
        </Card>
      </div>

      <Card>
        <OutreachTable rows={rows} />
      </Card>
    </div>
  );
}
