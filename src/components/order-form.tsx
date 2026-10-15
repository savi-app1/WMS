'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatFcfa } from '@/lib/format';

export interface OrderFormProduct {
  id: number;
  name: string;
  slug: string;
  priceFcfa: number | null;
  stock: number | null;
  trackStock: boolean;
  maxQuantity: number;
}

export interface OrderFormZone {
  id: number;
  name: string;
  feeFcfa: number | null;
}

export interface OrderFormProps {
  products: OrderFormProduct[];
  zones: OrderFormZone[];
  defaultZoneId?: number | null;
  deliveryFeeDefault?: number | null;
  mode?: 'product' | 'cart';
  whatsappHref: string;
}

/**
 * Formulaire de commande (espace public).
 * Le client ne saisit jamais de prix : le serveur recalcule tout.
 */
export function OrderForm({
  products,
  zones,
  defaultZoneId = null,
  deliveryFeeDefault = null,
  mode = 'product',
  whatsappHref,
}: OrderFormProps) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, number>>(
    () => Object.fromEntries(products.map((product) => [product.id, 1])),
  );
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Ouagadougou');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [zoneId, setZoneId] = useState<number | null>(defaultZoneId);
  const [paymentMethod, setPaymentMethod] = useState('paiement_livraison');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedZone = useMemo(() => zones.find((zone) => zone.id === zoneId) ?? null, [zones, zoneId]);
  const deliveryFee = selectedZone ? selectedZone.feeFcfa : deliveryFeeDefault;

  const lines = products.map((product) => {
    const quantity = quantities[product.id] ?? 1;
    const unit = product.priceFcfa;
    return {
      product,
      quantity,
      unit,
      lineTotal: unit === null ? null : unit * quantity,
    };
  });

  const pricePending = lines.some((line) => line.unit === null);
  const subtotal = pricePending
    ? null
    : lines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0);
  const total = subtotal === null ? null : subtotal + (deliveryFee ?? 0);

  const setQuantity = (productId: number, value: number) => {
    const max = products.find((p) => p.id === productId)?.maxQuantity ?? 999;
    setQuantities((current) => ({ ...current, [productId]: Math.max(1, Math.min(value, max)) }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (products.length === 0) {
      setError('Votre panier est vide.');
      return;
    }
    if (customerName.trim().length < 2) {
      setError('Indiquez votre nom complet.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 6) {
      setError('Indiquez un numéro de téléphone valide.');
      return;
    }
    if (address.trim().length < 3) {
      setError('Indiquez une adresse de livraison précise.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          email: email || undefined,
          city,
          address,
          deliveryZone: selectedZone?.name,
          deliveryFeeFcfa: deliveryFee ?? undefined,
          items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
          note: note || undefined,
          paymentMethod,
          website,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Votre commande n’a pas pu être enregistrée.');
        setSubmitting(false);
        return;
      }
      try {
        window.localStorage.removeItem('wms_cart');
        window.dispatchEvent(new Event('wms:cart-updated'));
      } catch {
        /* stockage indisponible */
      }
      router.push(`/commande/${data.orderNumber}?token=${encodeURIComponent(data.publicToken)}`);
    } catch {
      setError(
        'Connexion impossible. Vérifiez votre réseau, ou commandez directement sur WhatsApp : ' +
          'le numéro est en bas de l’écran.',
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />

      {/* Lignes produits */}
      <div className="space-y-3">
        {lines.map((line) => (
          <div key={line.product.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand-line p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-brand-black">{line.product.name}</p>
              <p className="text-xs text-brand-gray">
                {line.product.priceFcfa !== null ? formatFcfa(line.product.priceFcfa) : 'Prix à confirmer'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                className="h-9 w-9 rounded-lg border border-brand-line text-lg font-bold text-brand-ink disabled:opacity-40"
                disabled={line.quantity <= 1}
                aria-label={`Diminuer la quantité de ${line.product.name}`}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={line.product.maxQuantity}
                value={line.quantity}
                onChange={(event) => setQuantity(line.product.id, Number(event.target.value))}
                className="h-9 w-14 rounded-lg border border-brand-line text-center text-sm font-bold"
                aria-label={`Quantité pour ${line.product.name}`}
              />
              <button
                type="button"
                onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                className="h-9 w-9 rounded-lg border border-brand-line text-lg font-bold text-brand-ink"
                disabled={line.quantity >= line.product.maxQuantity}
                aria-label={`Augmenter la quantité de ${line.product.name}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Coordonnées */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerName" className="label-wms">
            Nom et prénom <span className="text-brand-red">*</span>
          </label>
          <input
            id="customerName"
            name="customerName"
            className="input-wms"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            placeholder="Ex. Aminata Sawadogo"
          />
        </div>
        <div>
          <label htmlFor="phone" className="label-wms">
            Téléphone / WhatsApp <span className="text-brand-red">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="input-wms"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            autoComplete="tel"
            placeholder="Ex. 70 00 00 00"
          />
        </div>
        <div>
          <label htmlFor="email" className="label-wms">
            E-mail <span className="font-normal text-brand-gray">(facultatif)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input-wms"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="nom@exemple.com"
          />
        </div>
        <div>
          <label htmlFor="city" className="label-wms">
            Ville
          </label>
          <input
            id="city"
            name="city"
            className="input-wms"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            autoComplete="address-level2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="label-wms">
          Adresse de livraison <span className="text-brand-red">*</span>
        </label>
        <textarea
          id="address"
          name="address"
          className="input-wms min-h-[84px]"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          required
          minLength={3}
          maxLength={400}
          autoComplete="street-address"
          placeholder="Quartier, repère, point de rencontre…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="zone" className="label-wms">
            Zone de livraison
          </label>
          <select
            id="zone"
            name="zone"
            className="input-wms"
            value={zoneId === null ? '' : String(zoneId)}
            onChange={(event) => setZoneId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">À confirmer avec WMS</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
                {zone.feeFcfa !== null ? ` — ${formatFcfa(zone.feeFcfa)}` : ' — frais à confirmer'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="paymentMethod" className="label-wms">
            Moyen de paiement souhaité
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            className="input-wms"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            <option value="paiement_livraison">Paiement à la livraison</option>
            <option value="mobile_money">Mobile Money (à confirmer par WMS)</option>
            <option value="a_confirmer">À définir avec WMS</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="note" className="label-wms">
          Note pour WMS <span className="font-normal text-brand-gray">(facultatif)</span>
        </label>
        <textarea
          id="note"
          name="note"
          className="input-wms min-h-[70px]"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          placeholder="Précision sur le produit, l’horaire de livraison, la couleur…"
        />
      </div>

      {/* Récapitulatif */}
      <div className="rounded-xl border border-brand-line bg-brand-light p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-gray">Récapitulatif</h3>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-brand-gray">Sous-total</dt>
            <dd className="font-semibold text-brand-black">
              {subtotal === null ? 'Prix à confirmer' : formatFcfa(subtotal)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-brand-gray">Frais de livraison</dt>
            <dd className="font-semibold text-brand-black">
              {deliveryFee === null || deliveryFee === undefined
                ? 'À confirmer'
                : deliveryFee === 0
                  ? 'Offerts'
                  : formatFcfa(deliveryFee)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-brand-line pt-2 text-base">
            <dt className="font-bold text-brand-black">Total estimé</dt>
            <dd className="font-extrabold text-brand-red">
              {total === null ? 'À confirmer par WMS' : formatFcfa(total)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs leading-relaxed text-brand-gray">
          Ce montant est un estimé calculé à partir des prix enregistrés par WMS. Il n&apos;est
          débité d&apos;aucun moyen de paiement : le règlement se fait à la livraison, après votre
          accord.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Envoi en cours…' : 'Valider ma commande'}
        </button>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">
          Commander plutôt sur WhatsApp
        </a>
      </div>

      {mode === 'product' && (
        <p className="text-center text-xs text-brand-gray">
          En validant, vous acceptez que WMS vous contacte par téléphone ou WhatsApp pour confirmer votre
          commande.
        </p>
      )}
    </form>
  );
}
