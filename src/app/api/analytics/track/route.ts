import { NextResponse } from 'next/server';
import { trackEvent, type EventType } from '@/lib/analytics';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp, hashIp } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS: EventType[] = [
  'page_view',
  'product_view',
  'whatsapp_click',
  'checkout_start',
  'order_created',
];

/** Collecte des événements d'audience (première partie, sans cookie publicitaire). */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const type = payload.type as EventType;
  if (!ALLOWED_EVENTS.includes(type)) {
    return NextResponse.json({ error: 'Type d’événement inconnu.' }, { status: 400 });
  }

  const ipHash = hashIp(await getClientIp());
  const limit = checkRateLimit(`track:${ipHash}`, 240, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const utm = (payload.utm ?? {}) as Record<string, string | undefined>;

  trackEvent({
    type,
    path: typeof payload.path === 'string' ? payload.path.slice(0, 300) : undefined,
    productId: typeof payload.productId === 'number' ? payload.productId : undefined,
    referrer: typeof payload.referrer === 'string' ? payload.referrer.slice(0, 500) : undefined,
    device: typeof payload.device === 'string' ? payload.device.slice(0, 40) : undefined,
    visitorId: typeof payload.visitorId === 'string' ? payload.visitorId.slice(0, 64) : undefined,
    utm: {
      source: utm.source?.slice(0, 100),
      medium: utm.medium?.slice(0, 100),
      campaign: utm.campaign?.slice(0, 100),
      content: utm.content?.slice(0, 100),
      term: utm.term?.slice(0, 100),
    },
  });

  return NextResponse.json({ ok: true });
}
