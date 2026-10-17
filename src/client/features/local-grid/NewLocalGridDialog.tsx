import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { FieldError } from "@/client/components/ui/field";
import {
  BusinessPicker,
  type PickedBusiness,
} from "@/client/features/local-grid/BusinessPicker";
import {
  LocalGridMap,
  MapsProvider,
  useLocalGridMapsConfig,
} from "@/client/features/local-grid/LocalGridMap";
import { formatGridCost } from "@/client/features/local-grid/format";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { createLocalGrid, runLocalGrid } from "@/serverFunctions/local-grid";
import {
  buildRankGridPoints,
  LOCAL_GRID_SIZES,
  type LocalGridSize,
} from "@/shared/local-grid";

const SIZE_ITEMS = LOCAL_GRID_SIZES.map((size) => ({
  value: size,
  label: `${size} × ${size} (${size * size} searches)`,
}));

const SPACING_ITEMS = [0.5, 1, 2, 3, 5, 8].map((km) => ({
  value: km,
  label: `${km} km apart`,
}));

const DEVICE_ITEMS = [
  { value: "mobile" as const, label: "Mobile" },
  { value: "desktop" as const, label: "Desktop" },
];

type FormValues = {
  keyword: string;
  business: PickedBusiness | null;
  gridSize: LocalGridSize;
  spacingKm: number;
  device: "mobile" | "desktop";
};

export function NewLocalGridDialog({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mapsConfig = useLocalGridMapsConfig();
  const apiKey = mapsConfig.data?.apiKey;
  const [defaultValues] = useState<FormValues>({
    keyword: "",
    business: null,
    gridSize: 5,
    spacingKm: 1,
    device: "mobile",
  });

  const createAndRun = useMutation({
    mutationFn: async (value: FormValues & { business: PickedBusiness }) => {
      const { id: gridId } = await createLocalGrid({
        data: {
          projectId,
          keyword: value.keyword,
          businessName: value.business.name,
          businessPlaceId: value.business.placeId,
          centerLatitude: value.business.latitude,
          centerLongitude: value.business.longitude,
          gridSize: value.gridSize,
          spacingKm: value.spacingKm,
          device: value.device,
        },
      });
      // The grid is saved even if the run is refused (no credits), so the
      // user lands on it and can retry from there.
      await queryClient.invalidateQueries({
        queryKey: ["localGrids", projectId],
      });
      const run = await runLocalGrid({ data: { projectId, gridId } }).catch(
        (error: unknown) => {
          toast.error(
            getStandardErrorMessage(
              error,
              "The grid was saved but did not run.",
            ),
          );
          return null;
        },
      );
      return { gridId, runId: run?.runId };
    },
    onSuccess: ({ gridId, runId }) => {
      onClose();
      void navigate({
        to: "/p/$projectId/local-grid/$gridId",
        params: { projectId, gridId },
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
          keyword: value.keyword.trim() ? undefined : "Enter a keyword",
          business: value.business ? undefined : "Pick the business",
        },
      }),
    },
    onSubmit: async ({ value }) => {
      if (!value.business) return;
      await createAndRun.mutateAsync({ ...value, business: value.business });
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  const previewPoints = values.business
    ? buildRankGridPoints(
        values.business,
        values.gridSize,
        values.spacingKm,
      ).map((point) => ({
        ...point,
        key: `${point.row}:${point.col}`,
        state: { kind: "preview" as const },
      }))
    : [];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <MapsProvider apiKey={apiKey}>
          <form.AppForm>
            <form.Form className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>New local grid</DialogTitle>
                <DialogDescription>
                  Search Google Maps from every point of a grid around a
                  business to see where it ranks across the area.
                </DialogDescription>
              </DialogHeader>

              <form.AppField name="keyword">
                {(field) => (
                  <field.TextField
                    label="Keyword"
                    placeholder="plumber near me"
                  />
                )}
              </form.AppField>

              <form.Field name="business">
                {(field) => (
                  <div className="flex flex-col gap-1">
                    <BusinessPicker
                      hasMapsKey={Boolean(apiKey)}
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                    {field.state.meta.errors[0] ? (
                      <FieldError>
                        {String(field.state.meta.errors[0])}
                      </FieldError>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <form.AppField name="gridSize">
                  {(field) => (
                    <field.SelectField label="Grid" items={SIZE_ITEMS} />
                  )}
                </form.AppField>
                <form.AppField name="spacingKm">
                  {(field) => (
                    <field.SelectField label="Spacing" items={SPACING_ITEMS} />
                  )}
                </form.AppField>
                <form.AppField name="device">
                  {(field) => (
                    <field.SelectField label="Device" items={DEVICE_ITEMS} />
                  )}
                </form.AppField>
              </div>

              {values.business ? (
                <LocalGridMap
                  // Refit the preview when the grid's footprint changes.
                  key={`${values.business.latitude}:${values.business.longitude}:${values.gridSize}:${values.spacingKm}`}
                  apiKey={apiKey}
                  mapId={mapsConfig.data?.mapId ?? "DEMO_MAP_ID"}
                  points={previewPoints}
                  gridSize={values.gridSize}
                  center={values.business}
                  className="h-64"
                />
              ) : null}

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
                  Run grid · {formatGridCost(values.gridSize)}
                </form.SubmitButton>
              </DialogFooter>
            </form.Form>
          </form.AppForm>
        </MapsProvider>
      </DialogContent>
    </Dialog>
  );
}
