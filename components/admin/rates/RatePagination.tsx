import Link from "next/link";

type RatePaginationProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string>;
};

function pageHref(basePath: string, searchParams: Record<string, string>, page: number) {
  const params = new URLSearchParams(searchParams);
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function RatePagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: RatePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-5 flex items-center justify-between gap-4" aria-label="Rate list pagination">
      {currentPage > 1 ? (
        <Link href={pageHref(basePath, searchParams, currentPage - 1)} className="inline-flex min-h-10 items-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 hover:border-amber-500">
          Previous
        </Link>
      ) : (
        <span className="inline-flex min-h-10 cursor-not-allowed items-center rounded-xl border border-stone-200 bg-stone-100 px-4 text-sm font-bold text-stone-400">Previous</span>
      )}
      <p className="text-xs font-bold text-stone-500">
        Page <span className="text-stone-900">{currentPage}</span> of <span className="text-stone-900">{totalPages}</span>
      </p>
      {currentPage < totalPages ? (
        <Link href={pageHref(basePath, searchParams, currentPage + 1)} className="inline-flex min-h-10 items-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 hover:border-amber-500">
          Next
        </Link>
      ) : (
        <span className="inline-flex min-h-10 cursor-not-allowed items-center rounded-xl border border-stone-200 bg-stone-100 px-4 text-sm font-bold text-stone-400">Next</span>
      )}
    </nav>
  );
}
