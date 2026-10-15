import { NextResponse } from 'next/server';
import { isGa4Configured, trafficSummary } from '@/lib/analytics';
import { requireAdmin, isGuardError } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get('days') || 30), 1), 365);

  return NextResponse.json({
    traffic: trafficSummary(days),
    ga4Configured: isGa4Configured(),
    ga4Id: isGa4Configured() ? process.env.NEXT_PUBLIC_GA_ID : null,
  });
}
