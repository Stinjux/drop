import "server-only";
import { manualProvider } from "./manual";
import type { FulfillmentProvider } from "./types";

const providers: Record<string, FulfillmentProvider> = { [manualProvider.id]: manualProvider };

/** Point unique de sélection du module fournisseur (remplaçable). */
export function getFulfillmentProvider(id = "manual"): FulfillmentProvider {
  return providers[id] ?? manualProvider;
}

export type { FulfillmentProvider, SupplierInstructions } from "./types";
