import Link from "next/link";
import { Inbox, BarChart3, FileText, Briefcase, PlusCircle } from "lucide-react";

const NAV = [
  { href: "/quick-add", label: "Quick Add", icon: PlusCircle },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="w-56 border-r border-border bg-surface flex flex-col">
      <div className="p-4 border-b border-border">
        <Link
          href="/leads"
          className="flex items-center gap-2 text-text font-semibold"
        >
          <Briefcase size={18} />
          Job Hunter
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded text-sm text-muted hover:text-text hover:bg-border/30 transition-colors"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 text-xs text-muted border-t border-border">
        Localhost · No auth
      </div>
    </aside>
  );
}
