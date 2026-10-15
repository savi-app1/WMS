/** Graphiques SVG légers (aucune dépendance externe, rendu serveur). */

export function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-brand-gray">Aucune donnée sur la période.</p>;
  }
  const max = Math.max(...data.map((point) => point.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div>
      <div className="flex h-32 items-end gap-[2px]" role="img" aria-label="Commandes par jour">
        {data.map((point, index) => {
          const height = Math.max((point.value / max) * 100, point.value > 0 ? 4 : 1);
          return (
            <div
              key={`${point.label}-${index}`}
              className="rounded-t bg-brand-red/80"
              style={{ width: `${barWidth}%`, height: `${height}%` }}
              title={`${point.label} : ${point.value} commande(s)`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-brand-gray">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function BarChart({
  data,
  formatValue = (value: number) => String(value),
}: {
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-brand-gray">Aucune donnée sur la période.</p>;
  }
  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <ul className="space-y-2.5">
      {data.map((point) => (
        <li key={point.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-semibold text-brand-black">{point.label}</span>
            <span className="shrink-0 font-bold text-brand-black">{formatValue(point.value)}</span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-brand-light">
            <div
              className="h-full rounded-full bg-brand-red"
              style={{ width: `${Math.max((point.value / max) * 100, point.value > 0 ? 3 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LineChart({
  data,
  height = 160,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  if (data.length < 2) {
    return <p className="py-8 text-center text-sm text-brand-gray">Pas encore assez de données.</p>;
  }
  const width = 600;
  const padding = 24;
  const max = Math.max(...data.map((point) => point.value), 1);
  const stepX = (width - padding * 2) / (data.length - 1);
  const points = data.map((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return { x, y, ...point };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Évolution des commandes">
        <defs>
          <linearGradient id="wms-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e30613" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#e30613" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#wms-area)" />
        <path d={path} fill="none" stroke="#e30613" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="3" fill="#e30613">
            <title>{`${point.label} : ${point.value}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-brand-gray">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function DonutChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-brand-gray">Aucune donnée.</p>;
  }
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label="Répartition des statuts">
        <g transform="translate(70,70) rotate(-90)">
          <circle r={radius} fill="none" stroke="#f5f5f6" strokeWidth="18" />
          {data.map((item) => {
            const length = (item.value / total) * circumference;
            const circle = (
              <circle
                key={item.label}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return circle;
          })}
        </g>
        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0b0b0c">
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#6b6b70">
          commandes
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: item.color }} />
              <span className="truncate text-brand-gray">{item.label}</span>
            </span>
            <span className="shrink-0 font-bold text-brand-black">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
