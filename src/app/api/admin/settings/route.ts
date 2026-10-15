import { NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db';
import { defaultDeliveryFee, setDefaultDeliveryFee } from '@/lib/delivery';
import { requireAdmin, requireAdminMutation, isGuardError } from '@/lib/api-guard';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  deliveryDefaultFee: z.number().int().min(0).max(10_000_000).nullable().optional(),
  whatsappNumber: z.string().trim().max(20).optional(),
  contactEmail: z.string().trim().max(160).optional(),
  announcement: z.string().trim().max(300).optional(),
});

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  return NextResponse.json({
    settings: {
      deliveryDefaultFee: defaultDeliveryFee(),
      whatsappNumber: getSetting<string>('whatsapp_number', process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '22656592557'),
      contactEmail: getSetting<string>('contact_email', process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ''),
      announcement: getSetting<string>('announcement', ''),
    },
  });
}

export async function PATCH(request: Request) {
  const guard = await requireAdminMutation(request);
  if (isGuardError(guard)) return guard;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Réglages invalides.' }, { status: 400 });
  }

  if (parsed.data.deliveryDefaultFee !== undefined) {
    setDefaultDeliveryFee(parsed.data.deliveryDefaultFee);
  }
  if (parsed.data.whatsappNumber !== undefined) {
    setSetting('whatsapp_number', parsed.data.whatsappNumber);
  }
  if (parsed.data.contactEmail !== undefined) {
    setSetting('contact_email', parsed.data.contactEmail);
  }
  if (parsed.data.announcement !== undefined) {
    setSetting('announcement', parsed.data.announcement);
  }

  return NextResponse.json({ ok: true });
}
