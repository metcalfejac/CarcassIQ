import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export interface Suggestions {
  productNames: string[];
  supplierNames: string[];
  cutNames: string[];
  ingredientNames: string[];
}

const empty: Suggestions = { productNames: [], supplierNames: [], cutNames: [], ingredientNames: [] };

/** Builds autocomplete lists from the user's own history — previously typed
 *  product names, suppliers, cut names, and ingredient names — so repeat
 *  weekly entries (same lamb, same supplier, same pie ingredients) go
 *  faster. No new tables: just distinct values pulled from what's already
 *  saved. */
export function useSuggestions(): Suggestions {
  const [suggestions, setSuggestions] = useState<Suggestions>(empty);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      supabase.from('costings').select('product_name, supplier, carcass_group_id'),
      supabase.from('manufactured_products').select('product_name, ingredients'),
    ]).then(([costingsResult, manufacturedResult]) => {
      if (cancelled) return;

      const productNames = new Set<string>();
      const supplierNames = new Set<string>();
      const cutNames = new Set<string>();
      const ingredientNames = new Set<string>();

      for (const row of costingsResult.data ?? []) {
        if (row.supplier) supplierNames.add(row.supplier);
        if (row.product_name) {
          if (row.carcass_group_id) cutNames.add(row.product_name);
          else productNames.add(row.product_name);
        }
      }

      for (const row of manufacturedResult.data ?? []) {
        if (row.product_name) productNames.add(row.product_name);
        const ingredients = Array.isArray(row.ingredients) ? row.ingredients : [];
        for (const ing of ingredients as { name?: string }[]) {
          if (ing?.name) ingredientNames.add(ing.name);
        }
      }

      setSuggestions({
        productNames: Array.from(productNames).sort(),
        supplierNames: Array.from(supplierNames).sort(),
        cutNames: Array.from(cutNames).sort(),
        ingredientNames: Array.from(ingredientNames).sort(),
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return suggestions;
}
