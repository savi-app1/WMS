import type { Metadata } from 'next';
import { ScriptsManager } from '@/components/admin/scripts-manager';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Scripts & contenus — WMS' };

export default function AdminScriptsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-black">Scripts & contenus</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Bibliothèque privée : scripts vidéo, voix off, textes de publication, dialogues et FAQ. Chaque
          contenu reste un brouillon tant qu&apos;il n&apos;est pas validé, et aucune publication n&apos;est
          automatique.
        </p>
      </header>

      <ScriptsManager />
    </div>
  );
}
