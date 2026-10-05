import "server-only";
import { supplier } from "../supplier-config";
import type { FulfillmentProvider } from "./types";

export const manualProvider: FulfillmentProvider = {
  id: "manual",
  label: "Manuel (commande passée par l'administrateur)",
  automatic: false,
  instructions(order) {
    const lines = order.items.map((item) => {
      const map = supplier.variants[item.variantId];
      const unit = supplier.costVerified ? map?.unitCostCents ?? null : null;
      return {
        sku: item.sku,
        variantLabel: item.variantLabel,
        supplierOptionLabel: map?.supplierOptionLabel ?? "Correspondance à configurer",
        quantity: item.quantity,
        estimatedCostCents: unit === null ? null : unit * item.quantity,
      };
    });
    const costs = lines.map((l) => l.estimatedCostCents);
    const estimatedTotalCostCents = costs.every((c) => c !== null) ? costs.reduce<number>((s, c) => s + (c ?? 0), 0) : null;
    const shippingAddress = [
      order.shipName,
      order.shipLine1,
      order.shipLine2,
      [order.shipCity, order.shipState, order.shipPostalCode].filter(Boolean).join(", "),
      order.shipCountry,
    ]
      .filter(Boolean)
      .join("\n");
    return {
      supplierName: supplier.name,
      productUrl: supplier.productUrl,
      shippingMethod: supplier.shippingMethod,
      lines,
      shippingAddress,
      phone: order.customerPhone,
      estimatedTotalCostCents,
      costVerified: supplier.costVerified,
      gift: order.giftLabel,
      notes: supplier.notes,
    };
  },
};
