/** Formatage localisé (fr-FR) et helpers d'affichage. */

export function formatFcfa(amount: number | null | undefined, options: { withSuffix?: boolean } = {}): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return 'Prix à confirmer';
  const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);
  return options.withSuffix === false ? formatted : `${formatted} FCFA`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Ouagadougou',
  }).format(date);
}

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeZone: 'Africa/Ouagadougou',
  }).format(date);
}

export function formatMonth(key: string): string {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `il y a ${days} j`;
  return formatDate(iso);
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Normalise un numéro burkinabè : 01 23 45 67 89 / +226 01 23 45 67 89 → 2260123456789 */
/**
 * Vérifie qu'un numéro saisi par le client correspond aux 4 derniers chiffres du
 * numéro enregistré avec la commande.
 *
 * La comparaison porte sur les chiffres bruts : la normalisation du numéro
 * complet (indicatif pays, suppression du zéro initial) ne doit pas s'appliquer
 * ici, sinon un numéro terminé par « 0000 » serait interprété comme un indicatif
 * international et le client ne pourrait plus suivre sa commande.
 */
export function matchesPhoneTail(provided: string, recorded: string): boolean {
  const digitsOnly = (value: string) => value.replace(/\D/g, '');
  const providedDigits = digitsOnly(provided);
  const recordedDigits = digitsOnly(recorded);
  if (providedDigits.length < 4 || recordedDigits.length < 4) return false;
  return recordedDigits.endsWith(providedDigits.slice(-4));
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('226')) return digits;
  if (digits.startsWith('0')) return `226${digits.slice(1)}`;
  if (digits.length === 8) return `226${digits}`;
  return digits;
}

export function isValidBurkinaPhone(input: string): boolean {
  const normalized = normalizePhone(input);
  return /^226[0-9]{8}$/.test(normalized);
}

export function formatPhone(input: string): string {
  const normalized = normalizePhone(input);
  if (!normalized.startsWith('226') || normalized.length !== 11) return input;
  const rest = normalized.slice(3);
  return `+226 ${rest.slice(0, 2)} ${rest.slice(2, 4)} ${rest.slice(4, 6)} ${rest.slice(6, 8)}`;
}
