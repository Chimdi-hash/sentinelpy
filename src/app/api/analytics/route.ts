import { NextRequest, NextResponse } from 'next/server';
import { logVisitor, getAnalyticsMetrics, getRecentVisitorLogs } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, referrer } = body;

    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const rawIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || '127.0.0.1');
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Hash IP for privacy salted with daily date
    const visitorHash = crypto
      .createHash('sha256')
      .update(rawIp + (new Date().toISOString().slice(0, 10)))
      .digest('hex')
      .slice(0, 16);

    logVisitor({
      visitorHash,
      page: page || '/',
      referrer: referrer || null,
      userAgent: userAgent.slice(0, 200),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging visitor:', error);
    return NextResponse.json({ error: 'Failed to log analytics' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const metrics = getAnalyticsMetrics();
    const recentLogs = getRecentVisitorLogs(10);

    return NextResponse.json({
      totalPageviews: metrics.totalPageviews,
      uniqueVisitors: metrics.uniqueVisitors,
      recentLogs,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
