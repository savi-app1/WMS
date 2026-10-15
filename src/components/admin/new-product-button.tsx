'use client';

import { useState } from 'react';
import { ProductForm } from './product-form';

export function NewProductButton({ categories }: { categories: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary !min-h-[40px] !py-2 text-sm">
        + Nouveau produit
      </button>
    );
  }

  return (
    <div className="card-wms w-full p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-brand-black">Nouveau produit</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-bold text-brand-gray"
        >
          Fermer
        </button>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
