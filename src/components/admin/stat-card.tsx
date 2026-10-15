import Link from 'next/link';

const TONES: Record<string, string> = {
  red: 'text-brand-red',
  blue: 'text-blue-600',
  violet: 'text-violet-600',
  cyan: 'text-cyan-700',
  green: 'text-emerald-600',
  gray: 'text-brand-gray',
  amber: 'text-amber-600',
};

export function StatCard({
  label,
  value,
  hint,
  tone = 'gray',
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: keyof typeof TONES | string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-gray">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${TONES[tone] ?? TONES.gray}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-brand-gray">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card-wms block p-3.5 transition-colors hover:border-brand-red">
        {content}
      </Link>
    );
  }
  return <div className="card-wms p-3.5">{content}</div>;
}
