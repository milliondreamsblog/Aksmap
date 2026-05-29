import { QuickAddForm } from "@/components/quick-add/QuickAddForm";

export default function QuickAddPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-text">Quick Add</h1>
        <p className="text-muted text-sm mt-1">
          Paste a Twitter or LinkedIn hiring post — get a scored lead with a
          draft message in seconds.
        </p>
      </header>
      <QuickAddForm />
    </div>
  );
}
