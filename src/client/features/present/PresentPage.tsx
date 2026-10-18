import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  PRESENT_SECTIONS,
  type PresentSection,
} from "@/client/features/present/PresentBits";
import { PresentOverview } from "@/client/features/present/PresentOverview";
import { PresentProgress } from "@/client/features/present/PresentProgress";
import { PresentRankings } from "@/client/features/present/PresentRankings";
import {
  PresentListings,
  PresentMap,
  PresentSearch,
} from "@/client/features/present/PresentSections";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { cn } from "cn";

/**
 * A full-screen view of one client's live results, for showing them in a
 * meeting. It has no sidebar and shows no other clients, prices or agency
 * tools, and nothing on it starts a paid check.
 */
export function PresentPage({
  projectId,
  section,
  demo,
}: {
  projectId: string;
  section: PresentSection;
  /** Practice mode: sample Search Console numbers, clearly marked. */
  demo: boolean;
}) {
  const projects = useQuery(projectsQueryOptions());
  const project = projects.data?.find((item) => item.id === projectId);

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
      <header className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            Google visibility report
          </p>
          <h1 className="truncate text-3xl font-semibold tracking-tight md:text-4xl">
            {project?.name ?? " "}
          </h1>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/p/$projectId" params={{ projectId }} />}
        >
          <X data-icon="inline-start" />
          Exit
        </Button>
      </header>

      <nav
        aria-label="Report sections"
        className="flex flex-wrap gap-2 border-b border-border pb-4"
      >
        {PRESENT_SECTIONS.map((item) => (
          <Link
            key={item.id}
            to="/p/$projectId/present"
            params={{ projectId }}
            search={{
              section: item.id,
              ...(demo ? { demo: true as const } : {}),
            }}
            replace
            className={cn(
              "rounded-full px-4 py-2 text-base font-medium transition-colors",
              item.id === section
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="pb-16">
        {section === "overview" ? (
          <PresentOverview projectId={projectId} />
        ) : section === "progress" ? (
          <PresentProgress projectId={projectId} />
        ) : section === "map" ? (
          <PresentMap projectId={projectId} />
        ) : section === "rankings" ? (
          <PresentRankings projectId={projectId} />
        ) : section === "listings" ? (
          <PresentListings projectId={projectId} />
        ) : (
          <PresentSearch projectId={projectId} demo={demo} />
        )}
      </main>
    </div>
  );
}
