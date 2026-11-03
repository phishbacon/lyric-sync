import Link from "next/link";

export function ListingPagination({ path, params, page, total, pageSize }: {
  path: string;
  params: Record<string, string>;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (target: number) => {
    const query = new URLSearchParams(params);
    if (target === 1) query.delete("page");
    else query.set("page", String(target));
    return `${path}?${query}`;
  };
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-4 text-sm">
      {page > 1
        ? <Link href={href(page - 1)} scroll={false} className="rounded-md border border-border px-3 py-2 hover:border-accent">Previous</Link>
        : <span className="rounded-md border border-border px-3 py-2 text-muted/50">Previous</span>}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages
        ? <Link href={href(page + 1)} scroll={false} className="rounded-md border border-border px-3 py-2 hover:border-accent">Next</Link>
        : <span className="rounded-md border border-border px-3 py-2 text-muted/50">Next</span>}
    </nav>
  );
}
