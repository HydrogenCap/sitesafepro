import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import {
  requireString,
  ValidationError,
  validationErrorResponse,
} from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_METERS = 30000;

interface Coordinates {
  lat: number;
  lon: number;
}

interface GeocodedLocation extends Coordinates {
  displayName: string;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: Coordinates;
  tags?: Record<string, string>;
}

function getRequestHeaders(): HeadersInit {
  const contactEmail = Deno.env.get("CONTACT_EMAIL");
  const userAgent = contactEmail
    ? `SiteSafePro Emergency Lookup (${contactEmail})`
    : "SiteSafePro Emergency Lookup";

  return {
    "Accept-Language": "en-GB,en;q=0.9",
    "User-Agent": userAgent,
  };
}

function getCoordinates(element: OverpassElement): Coordinates | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lon: element.lon };
  }

  if (element.center) {
    return element.center;
  }

  return null;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceMiles(from: Coordinates, to: Coordinates): number {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = earthRadiusMeters * c;
  return distanceMeters / 1609.344;
}

function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} miles away`;
}

function formatAddress(tags?: Record<string, string>): string | null {
  if (!tags) return null;

  const streetLine = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ")
    .trim();

  const locality = [
    streetLine || undefined,
    tags["addr:city"],
    tags["addr:town"],
    tags["addr:village"],
    tags["addr:postcode"],
  ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index);

  if (locality.length === 0) {
    return null;
  }

  return locality.join(", ");
}

async function geocodeAddress(
  address: string,
  requestHeaders: HeadersInit,
): Promise<GeocodedLocation | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "gb");
  url.searchParams.set("q", address);

  const response = await fetch(url.toString(), { headers: requestHeaders });
  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const match = results[0];
  return {
    lat: Number(match.lat),
    lon: Number(match.lon),
    displayName: String(match.display_name ?? address),
  };
}

async function fetchNearestService(
  query: string,
  origin: Coordinates,
  requestHeaders: HeadersInit,
): Promise<{ element: OverpassElement; distance: number } | null> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      ...requestHeaders,
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`Emergency lookup failed with status ${response.status}`);
  }

  const payload = await response.json();
  const elements = Array.isArray(payload?.elements) ? payload.elements as OverpassElement[] : [];

  let bestMatch: { element: OverpassElement; distance: number } | null = null;

  for (const element of elements) {
    const coords = getCoordinates(element);
    if (!coords) continue;

    const distance = distanceMiles(origin, coords);
    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { element, distance };
    }
  }

  return bestMatch;
}

function buildHospitalQuery(coords: Coordinates): string {
  return `
[out:json][timeout:25];
(
  nwr(around:${SEARCH_RADIUS_METERS},${coords.lat},${coords.lon})["amenity"="hospital"]["emergency"="yes"];
  nwr(around:${SEARCH_RADIUS_METERS},${coords.lat},${coords.lon})["healthcare"="hospital"]["emergency"="yes"];
);
out center tags;
`;
}

function buildFireStationQuery(coords: Coordinates): string {
  return `
[out:json][timeout:25];
(
  nwr(around:${SEARCH_RADIUS_METERS},${coords.lat},${coords.lon})["amenity"="fire_station"];
);
out center tags;
`;
}

function buildPoliceStationQuery(coords: Coordinates): string {
  return `
[out:json][timeout:25];
(
  nwr(around:${SEARCH_RADIUS_METERS},${coords.lat},${coords.lon})["amenity"="police"];
);
out center tags;
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const rateLimit = await enforceRateLimit({
      identifier: userId,
      scope: "lookup-emergency-services",
      limit: 20,
      windowSeconds: 3600,
    });

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const body = await req.json();
    const address = requireString(body.address, "address", { minLength: 5, maxLength: 255 });
    const requestHeaders = getRequestHeaders();

    console.log(`Looking up emergency services for address: ${address}`);

    const geocoded = await geocodeAddress(address, requestHeaders);
    if (!geocoded) {
      return new Response(
        JSON.stringify({ error: "Unable to geocode the supplied UK address" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [hospital, fireStation, policeStation] = await Promise.all([
      fetchNearestService(buildHospitalQuery(geocoded), geocoded, requestHeaders),
      fetchNearestService(buildFireStationQuery(geocoded), geocoded, requestHeaders),
      fetchNearestService(buildPoliceStationQuery(geocoded), geocoded, requestHeaders),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          nearest_ae_name: hospital?.element.tags?.name ?? null,
          nearest_ae_address: formatAddress(hospital?.element.tags) ?? null,
          nearest_ae_distance: hospital ? formatDistance(hospital.distance) : null,
          nearest_fire_station_name: fireStation?.element.tags?.name ?? null,
          nearest_fire_station_address: formatAddress(fireStation?.element.tags) ?? null,
          nearest_police_station_name: policeStation?.element.tags?.name ?? null,
          nearest_police_station_address: formatAddress(policeStation?.element.tags) ?? null,
        },
        geocodedAddress: geocoded.displayName,
        source: "openstreetmap_lookup",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }

    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in lookup-emergency-services:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
