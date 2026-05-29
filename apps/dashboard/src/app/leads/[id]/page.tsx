import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLeadById } from "@/lib/queries";
import { CompanyCard } from "@/components/lead-detail/CompanyCard";
import { ContactCard } from "@/components/lead-detail/ContactCard";
import { ScoreCard } from "@/components/lead-detail/ScoreCard";
import { MessageDrafter } from "@/components/lead-detail/MessageDrafter";
import { SentMessages } from "@/components/lead-detail/SentMessages";
import { ActionBar } from "@/components/lead-detail/ActionBar";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-muted hover:text-text text-sm"
      >
        <ArrowLeft size={14} /> Back to leads
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{lead.company.name}</h1>
        <p className="text-muted text-sm">
          {lead.company.description ?? "No description"}
        </p>
      </header>

      <ActionBar lead={lead} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <CompanyCard lead={lead} />
          <MessageDrafter lead={lead} />
          <SentMessages messages={lead.messages} />
        </div>
        <div className="space-y-4">
          <ScoreCard lead={lead} />
          <ContactCard lead={lead} />
        </div>
      </div>
    </div>
  );
}
