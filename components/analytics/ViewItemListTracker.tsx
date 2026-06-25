"use client";

import { useEffect } from "react";
import { trackViewItemList, type Product } from "@/lib/analytics";

/**
 * Pousse un event GA4 `view_item_list` au mount, depuis un Server Component
 * (ex: page catégorie). Ne rend rien.
 */
export default function ViewItemListTracker({ items, listName }: { items: Product[]; listName: string }) {
  useEffect(() => {
    if (items && items.length > 0) trackViewItemList(items, listName);
    // On ne veut tracker qu'une fois par affichage de liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listName]);
  return null;
}
