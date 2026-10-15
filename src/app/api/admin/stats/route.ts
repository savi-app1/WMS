import { NextResponse } from 'next/server';
import {
  compareWithPreviousPeriod,
  dailySeries,
  monthlySeries,
  statusBreakdown,
  topProducts,
} from '@/lib/stats';
import { requireAdmin, isGuardError } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isGuardError(guard)) return guard;

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get('days') || 30), 1), 365);
  const from = new Date(Date.now() - days * 86400000).toISOString();
  const to = new Date().toISOString();

  const comparison = compareWithPreviousPeriod(days);

  return NextResponse.json({
    current: comparison.current,
    previous: comparison.previous,
    daily: dailySeries(from, to),
    monthly: monthlySeries(12),
    byStatus: statusBreakdown(),
    topProducts: topProducts(8, from, to),
    topProductsAll: topProducts(8),
  });
}
