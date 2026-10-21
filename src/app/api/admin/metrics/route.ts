import { NextRequest, NextResponse } from 'next/server';
import { countUsers, countFlaggedUsers, getAnalyticsMetrics, listUsers, getRecentVisitorLogs } from '@/lib/db';

const AUTHORIZED_ADMIN = (process.env.ADMIN_WALLET_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "").toLowerCase();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callerAddress = (searchParams.get('admin') || request.headers.get('x-admin-address') || '').toLowerCase();

    // Check authorization
    if (callerAddress !== AUTHORIZED_ADMIN) {
      return NextResponse.json({ error: 'Unauthorized. Admin access denied.' }, { status: 403 });
    }

    const totalUsers = countUsers();
    const flaggedUsers = countFlaggedUsers();
    const analytics = getAnalyticsMetrics();

    const recentUsers = listUsers(undefined, 20);
    const recentLogs = getRecentVisitorLogs(20);

    const formattedUsers = recentUsers.map((u) => ({
      ...u,
      roles: u.roles ? JSON.parse(u.roles) : [],
      skills: u.skills ? JSON.parse(u.skills) : [],
    }));

    return NextResponse.json({
      authorized: true,
      metrics: {
        totalUsers,
        flaggedUsers,
        totalPageviews: analytics.totalPageviews,
        uniqueVisitors: analytics.uniqueVisitors,
      },
      recentUsers: formattedUsers,
      recentLogs,
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch admin metrics' }, { status: 500 });
  }
}
