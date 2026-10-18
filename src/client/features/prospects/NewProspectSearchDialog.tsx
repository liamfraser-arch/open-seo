import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CountryCombobox } from "@/client/components/CountryCombobox";
import { SerpLocationCombobox } from "@/client/components/SerpLocationCombobox";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { formatProspectSearchCost } from "@/client/features/prospects/format";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { getLastProjectId } from "@/client/lib/active-project";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { createProspectSearch } from "@/serverFunctions/prospects";
import {
  DEFAULT_LOCATION_CODE,
  getIsoCountryCode,
} from "@/shared/keyword-locations";

export function NewProspectSearchDialog({ onClose }: { onClose: () => void }) {
  const keywordId = useId();
  const cityId = useId();
  const countryId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [locationName, setLocationName] = useState<string | undefined>();
  const [country, setCountry] = useState<number | null>(null);
  const projects = useQuery(projectsQueryOptions());
  // Starts on the market of the project you were last in; any country works.
  const lastProjectId = getLastProjectId();
  const locationCode =
    country ??
    (
      projects.data?.find((project) => project.id === lastProjectId) ??
      projects.data?.[0]
    )?.locationCode ??
    DEFAULT_LOCATION_CODE;
  const countryCode = getIsoCountryCode(locationCode);

  const search = useMutation({
    mutationFn: () =>
      createProspectSearch({
        data: {
          keyword: keyword.trim(),
          locationCode,
          locationName: locationName ?? "",
        },
      }),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({
        queryKey: ["prospectSearches"],
      });
      onClose();
      void navigate({
        to: "/prospects/$searchId",
        params: { searchId: id },
      });
    },
  });

  const ready = keyword.trim() !== "" && Boolean(locationName);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !search.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) search.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Find prospects</DialogTitle>
            <DialogDescription>
              Searches Google Maps for a type of business in a city, then ranks
              the results by how much help each one could use.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor={keywordId}>Type of business</FieldLabel>
            <Input
              id={keywordId}
              value={keyword}
              placeholder="hvac contractor"
              autoComplete="off"
              onChange={(event) => setKeyword(event.target.value)}
            />
            <FieldDescription>
              Search it the way a customer would: plumber, roofer, dentist.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor={countryId}>Country</FieldLabel>
            <CountryCombobox
              id={countryId}
              value={locationCode}
              onChange={(code) => {
                setCountry(code);
                // A city belongs to one country.
                setLocationName(undefined);
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={cityId}>City</FieldLabel>
            <SerpLocationCombobox
              key={countryCode}
              id={cityId}
              value={locationName}
              onChange={setLocationName}
              countryCode={countryCode}
              placeholder="Search cities..."
            />
          </Field>

          {search.isError ? (
            <FieldError>
              {getStandardErrorMessage(search.error, "The search failed.")}
            </FieldError>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={search.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!ready} pending={search.isPending}>
              Find prospects · {formatProspectSearchCost()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
