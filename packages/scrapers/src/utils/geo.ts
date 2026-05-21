import { config, type Geo } from "@job-hunter/icp";
import { geoFromLocation } from "./domain.js";

export function matchesActiveGeo(
  location: string | null | undefined,
): Geo | null {
  if (!location) return null;
  const geo = geoFromLocation(location);
  if (!geo) return null;
  return config.activeGeos[geo] ? geo : null;
}
