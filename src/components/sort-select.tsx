'use client';

import { useRouter } from 'next/navigation';

const SORTS = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'popular', label: 'Les plus commandés' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'name', label: 'Ordre alphabétique' },
];

/** Sélecteur de tri : met à jour l'URL (partageable, compatible SEO). */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();

  return (
    <select
      id="tri"
      name="tri"
      value={value}
      aria-label="Trier les produits"
      className="input-wms !min-h-[42px] !w-auto !py-1.5 text-sm"
      onChange={(event) => {
        const params = new URLSearchParams(window.location.search);
        if (event.target.value === 'recent') params.delete('tri');
        else params.set('tri', event.target.value);
        const query = params.toString();
        router.push(query ? `/boutique?${query}` : '/boutique', { scroll: false });
      }}
    >
      {SORTS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
