/// <reference types="google.maps" />
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, X } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";

export type PickedBusiness = {
  name: string;
  placeId?: string;
  address?: string;
  latitude: number;
  longitude: number;
};

/**
 * Picks the business the grid locates and centers on. With a Maps key it is a
 * Places search; without one the user types the name and coordinates.
 */
export function BusinessPicker({
  hasMapsKey,
  value,
  onChange,
}: {
  hasMapsKey: boolean;
  value: PickedBusiness | null;
  onChange: (business: PickedBusiness | null) => void;
}) {
  if (value) {
    return (
      <Field>
        <FieldLabel>Business</FieldLabel>
        <div className="flex items-start gap-2 rounded-md border px-3 py-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {value.address ??
                `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Change business"
            onClick={() => onChange(null)}
          >
            <X />
          </Button>
        </div>
      </Field>
    );
  }
  return hasMapsKey ? (
    <PlacesSearch onPick={onChange} />
  ) : (
    <ManualBusiness onPick={onChange} />
  );
}

function PlacesSearch({ onPick }: { onPick: (b: PickedBusiness) => void }) {
  const id = useId();
  const places = useMapsLibrary("places");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  // One token per pick groups the keystrokes and the details fetch into a
  // single Places session for billing.
  const [sessionToken, setSessionToken] =
    useState<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (places && !sessionToken) {
      setSessionToken(new places.AutocompleteSessionToken());
    }
  }, [places, sessionToken]);

  const suggestions = useQuery({
    queryKey: ["placesAutocomplete", query],
    enabled: Boolean(places && sessionToken && query.length >= 3),
    staleTime: 60_000,
    queryFn: async () => {
      if (!places || !sessionToken) return [];
      const { suggestions: rows } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken,
        });
      return rows.flatMap((row) =>
        row.placePrediction ? [row.placePrediction] : [],
      );
    },
  });

  const pick = async (prediction: google.maps.places.PlacePrediction) => {
    const place = prediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location"],
    });
    if (!place.location) return;
    setSessionToken(null);
    onPick({
      name: place.displayName ?? prediction.mainText?.text ?? "",
      placeId: place.id,
      address: place.formattedAddress ?? undefined,
      latitude: place.location.lat(),
      longitude: place.location.lng(),
    });
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>Business</FieldLabel>
      <Input
        id={id}
        value={input}
        autoComplete="off"
        placeholder="Search Google Maps for the business"
        onChange={(event) => setInput(event.target.value)}
      />
      {suggestions.data && suggestions.data.length > 0 ? (
        <ul className="max-h-56 divide-y overflow-auto rounded-md border">
          {suggestions.data.map((prediction) => (
            <li key={prediction.placeId}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                onClick={() => void pick(prediction)}
              >
                <p className="truncate text-sm">{prediction.mainText?.text}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {prediction.secondaryText?.text}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {suggestions.isError ? (
        <FieldDescription>
          Google Places search failed. Check that the Places API (New) is
          enabled for this Maps key.
        </FieldDescription>
      ) : null}
    </Field>
  );
}

function parseCoordinates(text: string) {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function ManualBusiness({ onPick }: { onPick: (b: PickedBusiness) => void }) {
  const nameId = useId();
  const coordinatesId = useId();
  const [name, setName] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const parsed = parseCoordinates(coordinates);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={nameId}>Business name</FieldLabel>
        <Input
          id={nameId}
          value={name}
          placeholder="As it appears on Google Maps"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={coordinatesId}>Location</FieldLabel>
        <Input
          id={coordinatesId}
          value={coordinates}
          placeholder="-33.9249, 18.4241"
          onChange={(event) => setCoordinates(event.target.value)}
        />
        <FieldDescription>
          Right-click the business on Google Maps to copy its coordinates.
        </FieldDescription>
      </Field>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="sm:col-span-2"
        disabled={!name.trim() || !parsed}
        onClick={() => {
          if (parsed) onPick({ name: name.trim(), ...parsed });
        }}
      >
        Use this business
      </Button>
    </div>
  );
}
