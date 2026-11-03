import { LibraryTabs } from "./library-tabs";

export function LibraryHeading({ title, count, noun }: { title: string; count: number; noun: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted">{count.toLocaleString()} {noun}</p>
      </div>
      <LibraryTabs />
    </div>
  );
}
