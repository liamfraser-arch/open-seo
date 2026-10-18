import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus, Target } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { NewProspectSearchDialog } from "@/client/features/prospects/NewProspectSearchDialog";
import { formatRunDate } from "@/client/features/local-grid/format";
import { listProspectSearches } from "@/serverFunctions/prospects";

type SearchRow = Awaited<ReturnType<typeof listProspectSearches>>[number];

export function ProspectList() {
  const [showNew, setShowNew] = useState(false);
  const searchesQuery = useQuery({
    queryKey: ["prospectSearches"],
    queryFn: () => listProspectSearches(),
  });
  const searches = searchesQuery.data;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-5 pt-4 pb-3">
        <CardTitle>
          <h2 className="text-sm font-semibold">Searches</h2>
        </CardTitle>
        <CardAction className="self-center">
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus data-icon="inline-start" />
            Find prospects
          </Button>
        </CardAction>
      </CardHeader>
      <div className="divide-y divide-border border-t border-border">
        {searchesQuery.isError ? (
          <div className="px-5 py-4">
            <QueryError
              error={searchesQuery.error}
              fallback="Failed to load prospect searches"
              onRetry={() => void searchesQuery.refetch()}
              isRetrying={searchesQuery.isFetching}
            />
          </div>
        ) : searchesQuery.isPending ? (
          <div className="space-y-4 px-5 py-4" aria-busy>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            ))}
          </div>
        ) : !searches || searches.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={Target}
            title="No searches yet"
            description="Pick a type of business and a city. You'll get a list of local businesses ranked by how much they need help, with their phone and website."
          />
        ) : (
          searches.map((search) => (
            <SearchRowLink key={search.id} search={search} />
          ))
        )}
      </div>
      {showNew ? (
        <NewProspectSearchDialog onClose={() => setShowNew(false)} />
      ) : null}
    </Card>
  );
}

function SearchRowLink({ search }: { search: SearchRow }) {
  return (
    <Link
      to="/prospects/$searchId"
      params={{ searchId: search.id }}
      className="flex items-center gap-4 px-5 py-3 hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{search.keyword}</p>
        <p className="truncate text-xs text-muted-foreground">
          {search.locationName.split(",")[0]} ·{" "}
          {formatRunDate(search.createdAt)}
        </p>
      </div>
      <div className="hidden text-right text-xs text-muted-foreground sm:block">
        <p className="text-sm text-foreground tabular-nums">
          {search.strong} strong prospects of {search.total}
        </p>
        <p>
          {search.contacted} contacted · {search.won} won
        </p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
