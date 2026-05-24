export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      {title && (
        <h3 className="text-xs uppercase tracking-wide text-muted mb-3 font-medium">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
