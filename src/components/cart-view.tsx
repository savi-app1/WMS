'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { OrderForm } from '@/components/order-form';
import { formatFcfa } from '@/lib/format';

export interface CartItem {
  productId: number;
  name: string;
  slug: string;
  priceFcfa: number | null;
  quantity: number;
  image?: string;
}

export function CartView({
  zones,
  whatsappHref,
}: {
  zones: { id: number; name: string; feeFcfa: number | null }[];
  whatsappHref: string;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('wms_cart');
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
    setLoaded(true);
  }, []);

  const update = (next: CartItem[]) => {
    setItems(next);
    try {
      window.localStorage.setItem('wms_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('wms:cart-updated'));
    } catch {
      /* stockage indisponible */
    }
  };

  const setQuantity = (productId: number, quantity: number) => {
    update(items.map((item) => (item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item)));
  };

  const remove = (productId: number) => update(items.filter((item) => item.productId !== productId));

  if (!loaded) {
    return <div className="card-wms p-8 text-center text-brand-gray">Chargement du panier…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="card-wms p-10 text-center">
        <h2 className="text-xl font-extrabold text-brand-black">Votre panier est vide</h2>
        <p className="mt-2 text-brand-gray">
          Parcourez le catalogue et ajoutez les produits qui vous intéressent.
        </p>
        <Link href="/boutique" className="btn-primary mt-5">
          Voir la boutique
        </Link>
      </div>
    );
  }

  const subtotalKnown = items.every((item) => item.priceFcfa !== null);
  const subtotal = subtotalKnown
    ? items.reduce((sum, item) => sum + (item.priceFcfa ?? 0) * item.quantity, 0)
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h2 className="text-lg font-extrabold text-brand-black">Votre sélection</h2>
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="card-wms flex gap-3 p-3">
              <Link
                href={`/boutique/${item.slug}`}
                className="media-frame h-20 w-20 shrink-0 overflow-hidden rounded-lg"
              >
                {item.image ? (
                  <Image src={item.image} alt="" width={80} height={80} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-brand-red">WMS</span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/boutique/${item.slug}`} className="text-sm font-bold text-brand-black hover:text-brand-red">
                  {item.name}
                </Link>
                <p className="text-xs text-brand-gray">
                  {item.priceFcfa !== null ? formatFcfa(item.priceFcfa) : 'Prix à confirmer'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    className="h-8 w-8 rounded-lg border border-brand-line font-bold"
                    aria-label={`Diminuer la quantité de ${item.name}`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => setQuantity(item.productId, Number(event.target.value))}
                    className="h-8 w-14 rounded-lg border border-brand-line text-center text-sm font-bold"
                    aria-label={`Quantité pour ${item.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    className="h-8 w-8 rounded-lg border border-brand-line font-bold"
                    aria-label={`Augmenter la quantité de ${item.name}`}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.productId)}
                    className="ml-auto text-xs font-semibold text-brand-red hover:underline"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {subtotal !== null && (
          <p className="mt-4 text-right text-sm text-brand-gray">
            Sous-total produits : <span className="font-bold text-brand-black">{formatFcfa(subtotal)}</span> (hors
            livraison)
          </p>
        )}
      </div>

      <div className="card-wms p-4 sm:p-5">
        <h2 className="text-lg font-extrabold text-brand-black">Vos informations</h2>
        <p className="mt-1 text-sm text-brand-gray">
          WMS vérifie chaque commande manuellement avant de confirmer la livraison.
        </p>
        <div className="mt-4">
          <OrderForm
            products={items.map((item) => ({
              id: item.productId,
              name: item.name,
              slug: item.slug,
              priceFcfa: item.priceFcfa,
              stock: null,
              trackStock: false,
              maxQuantity: 99,
            }))}
            zones={zones}
            whatsappHref={whatsappHref}
            mode="cart"
          />
        </div>
      </div>
    </div>
  );
}
