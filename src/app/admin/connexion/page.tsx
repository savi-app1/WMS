import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth';
import { LoginForm } from '@/components/admin/login-form';
import { BRAND_NAME } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Espace administration WMS',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getCurrentAdmin();
  if (user) redirect('/admin');

  return (
    <div className="flex min-h-screen flex-col bg-brand-light">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="card-wms p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Image src="/brand/wms-logo.png" alt="" width={48} height={48} className="h-12 w-12" />
              <div>
                <p className="text-sm font-extrabold text-brand-black">{BRAND_NAME}</p>
                <p className="text-xs font-semibold text-brand-red">Espace administration</p>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-brand-black">Connexion</h1>
            <p className="mt-1 text-sm text-brand-gray">
              Accès réservé à l&apos;administrateur WMS. Cet espace contient les données clients.
            </p>

            <div className="mt-6">
              <Suspense fallback={null}>
                <LoginForm />
              </Suspense>
            </div>

            <p className="mt-6 border-t border-brand-line pt-4 text-xs text-brand-gray">
              Après plusieurs tentatives échouées, la connexion est temporairement bloquée
              (protection contre le piratage). <Link href="/" className="font-semibold text-brand-red">Retour au site</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
