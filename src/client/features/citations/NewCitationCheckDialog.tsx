import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { revalidateLogic, useStore } from "@tanstack/react-form";
import { useAppForm } from "@/client/components/form/useAppForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { formatCitationCheckCost } from "@/client/features/citations/format";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { DEFAULT_LOCATION_CODE } from "@/shared/keyword-locations";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  createCitationCheck,
  listCitationBusinessCandidates,
  runCitationCheck,
} from "@/serverFunctions/citations";

type FormValues = { businessName: string; city: string };

export function NewCitationCheckDialog({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [defaultValues] = useState<FormValues>({ businessName: "", city: "" });
  const projects = useQuery(projectsQueryOptions());
  const locationCode =
    projects.data?.find((project) => project.id === projectId)?.locationCode ??
    DEFAULT_LOCATION_CODE;
  const candidates = useQuery({
    queryKey: ["citationBusinessCandidates", projectId],
    queryFn: () => listCitationBusinessCandidates({ data: { projectId } }),
  });

  const createAndRun = useMutation({
    mutationFn: async (value: FormValues) => {
      const { id: checkId } = await createCitationCheck({
        data: {
          projectId,
          businessName: value.businessName,
          city: value.city.trim() || undefined,
        },
      });
      // The check is saved even if the run is refused (no credits), so the
      // user lands on it and can retry from there.
      await queryClient.invalidateQueries({
        queryKey: ["citationChecks", projectId],
      });
      const run = await runCitationCheck({
        data: { projectId, checkId },
      }).catch((error: unknown) => {
        toast.error(
          getStandardErrorMessage(
            error,
            "The check was saved but did not run.",
          ),
        );
        return null;
      });
      return { checkId, runId: run?.runId };
    },
    onSuccess: ({ checkId, runId }) => {
      onClose();
      void navigate({
        to: "/p/$projectId/citations/$checkId",
        params: { projectId, checkId },
        search: runId ? { run: runId } : {},
      });
    },
  });

  const form = useAppForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => ({
        fields: {
          businessName: value.businessName.trim()
            ? undefined
            : "Enter the business name",
        },
      }),
    },
    onSubmit: async ({ value }) => {
      await createAndRun.mutateAsync(value);
    },
  });
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form.AppForm>
          <form.Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>New citation check</DialogTitle>
              <DialogDescription>
                Finds the directories that list this business, and the link to
                each listing.
              </DialogDescription>
            </DialogHeader>

            <form.AppField name="businessName">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <field.TextField label="Business name" />
                  {candidates.data && candidates.data.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {candidates.data.map((name) => (
                        <Button
                          key={name}
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => field.handleChange(name)}
                        >
                          {name}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </form.AppField>
            <form.AppField name="city">
              {(field) => (
                <field.TextField
                  label="City (optional)"
                  placeholder="Leave empty to find listings in every city"
                />
              )}
            </form.AppField>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Cancel
              </Button>
              <form.SubmitButton>
                Run check · {formatCitationCheckCost(locationCode)}
              </form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
