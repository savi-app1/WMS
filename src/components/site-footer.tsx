import Link from 'next/link';
import {
  BRAND_CITY,
  BRAND_EMAIL,
  BRAND_NAME,
  BRAND_SHORT,
  BRAND_TAGLINE,
  CONTACT_PHONE_PRIMARY,
  CONTACT_PHONE_SECONDARY,
} from '@/lib/paths';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-brand-line bg-brand-black text-neutral-200">
      <div className="container-wms py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-extrabold text-white">
              Wendmanegda <span className="text-brand-red">Multiples</span> Services
            </p>
            <p className="mt-2 text-sm text-neutral-400">{BRAND_TAGLINE}</p>
            <p className="mt-4 text-sm text-neutral-300">{BRAND_CITY}</p>
            <p className="text-sm text-neutral-400">Service client WhatsApp : {CONTACT_PHONE_PRIMARY}</p>
            <p className="text-sm text-neutral-400">Téléphone : {CONTACT_PHONE_SECONDARY}</p>
            <p className="text-sm text-neutral-400">E-mail : {BRAND_EMAIL}</p>
          </div>

          <nav aria-label="Boutique">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Boutique</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/boutique" className="text-neutral-300 hover:text-white">
                  Tous les produits
                </Link>
              </li>
              <li>
                <Link href="/boutique?categorie=smartphones-et-accessoires" className="text-neutral-300 hover:text-white">
                  Smartphones et accessoires
                </Link>
              </li>
              <li>
                <Link href="/boutique?categorie=electronique" className="text-neutral-300 hover:text-white">
                  Électronique
                </Link>
              </li>
              <li>
                <Link href="/boutique?categorie=formations-et-services-digitaux" className="text-neutral-300 hover:text-white">
                  Formations et services digitaux
                </Link>
              </li>
              <li>
                <Link href="/boutique?categorie=produits-numeriques-et-livres-pdf" className="text-neutral-300 hover:text-white">
                  Produits numériques et livres PDF
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Services">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Services WMS</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/services#graphique" className="text-neutral-300 hover:text-white">
                  Créations graphiques, logos, affiches
                </Link>
              </li>
              <li>
                <Link href="/services#ecommerce" className="text-neutral-300 hover:text-white">
                  Accompagnement e-commerce
                </Link>
              </li>
              <li>
                <Link href="/services#contenus" className="text-neutral-300 hover:text-white">
                  Contenus publicitaires
                </Link>
              </li>
              <li>
                <Link href="/services#academy" className="text-neutral-300 hover:text-white">
                  Formations WMS Academy
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Informations">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Informations</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/a-propos" className="text-neutral-300 hover:text-white">
                  À propos de WMS
                </Link>
              </li>
              <li>
                <Link href="/suivi" className="text-neutral-300 hover:text-white">
                  Suivre ma commande
                </Link>
              </li>
              <li>
                <Link href="/conditions" className="text-neutral-300 hover:text-white">
                  Conditions de vente
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="text-neutral-300 hover:text-white">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-neutral-300 hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {BRAND_NAME} ({BRAND_SHORT}). Tous droits réservés.
          </p>
          <p>
            Boutique en ligne operate à {BRAND_CITY}. Paiement à la livraison · Mobile Money · Commande
            WhatsApp.
          </p>
        </div>
      </div>
    </footer>
  );
}
