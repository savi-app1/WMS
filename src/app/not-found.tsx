import Link from 'next/link';
import { BRAND_NAME, CONTACT_PHONE_PRIMARY, WHATSAPP_NUMBER } from '@/lib/paths';

export default function NotFound() {
  return (
    <div className="container-wms flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-5xl font-extrabold text-brand-red">404</p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-black">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-2 max-w-md text-[15px] text-brand-gray">
        Le produit ou la page que vous cherchez a peut-être été déplacé. Retrouvez notre catalogue ou
        écrivez-nous sur WhatsApp.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href="/boutique" className="btn-primary">
          Voir la boutique
        </Link>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Bonjour WMS, je cherche un produit sur votre site.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary !bg-[#25D366]"
        >
          {CONTACT_PHONE_PRIMARY}
        </a>
      </div>
      <p className="mt-8 text-xs text-brand-gray">{BRAND_NAME}</p>
    </div>
  );
}
