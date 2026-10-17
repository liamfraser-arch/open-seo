import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { InlineConfirm } from "@/client/components/InlineConfirm";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  addPortalClient,
  listPortalClients,
  removePortalClient,
} from "@/serverFunctions/portal";

/** Who can open this project's read-only client portal. */
export function ClientAccessSection({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const queryKey = ["portalClients", projectId];

  const clientsQuery = useQuery({
    queryKey,
    queryFn: () => listPortalClients({ data: { projectId } }),
  });
  const addMutation = useMutation({
    mutationFn: () => addPortalClient({ data: { projectId, email } }),
    onSuccess: async () => {
      setEmail("");
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Client added");
    },
  });
  const removeMutation = useMutation({
    mutationFn: (clientId: string) =>
      removePortalClient({ data: { projectId, clientId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <section className="space-y-3 border-t border-border pt-8">
      <SectionHeader title="Client access" />
      <p className="text-sm text-muted-foreground">
        People listed here can sign in and see this project&rsquo;s live
        dashboard, read-only. They get a one-time code by email and can&rsquo;t
        see anything else.
      </p>
      <form
        className="flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (email.trim()) addMutation.mutate();
        }}
      >
        <Input
          type="email"
          placeholder="client@theircompany.com"
          aria-label="Client email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" disabled={!email.trim() || addMutation.isPending}>
          Add
        </Button>
      </form>

      {clientsQuery.isError ? (
        <QueryError
          error={clientsQuery.error}
          fallback="Failed to load clients"
          onRetry={() => void clientsQuery.refetch()}
          isRetrying={clientsQuery.isFetching}
        />
      ) : (
        <ul className="max-w-md divide-y divide-border">
          {clientsQuery.data?.map((client) => (
            <li
              key={client.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="truncate">{client.email}</span>
              <InlineConfirm
                label={`Remove ${client.email}`}
                pending={removeMutation.isPending}
                onConfirm={() => removeMutation.mutate(client.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <a href={`/portal/${projectId}`} target="_blank" rel="noreferrer" />
        }
      >
        <ExternalLink data-icon="inline-start" />
        Preview what they see
      </Button>
    </section>
  );
}
