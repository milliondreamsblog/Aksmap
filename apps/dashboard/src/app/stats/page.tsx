import { getStats } from "@/lib/queries";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getStats();
  const total = stats.byStatus.reduce((a, s) => a + s.count, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Stats</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card title="Total leads">
          <div className="text-3xl font-mono">{total}</div>
        </Card>
        <Card title="Companies">
          <div className="text-3xl font-mono">
            {stats.totals?.companies ?? 0}
          </div>
        </Card>
        <Card title="Scored">
          <div className="text-3xl font-mono">{stats.totals?.scored ?? 0}</div>
        </Card>
      </div>

      <Card title="Funnel">
        <table className="w-full text-sm">
          <tbody>
            {stats.byStatus.map((row) => (
              <tr
                key={row.status}
                className="border-b border-border last:border-b-0"
              >
                <td className="py-2 text-muted">{row.status}</td>
                <td className="py-2 font-mono text-right">{row.count}</td>
                <td className="py-2 text-muted text-right w-20">
                  {((row.count / Math.max(total, 1)) * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
