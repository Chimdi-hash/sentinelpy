import { NextRequest, NextResponse } from 'next/server';
import { listUsers } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || undefined;

    const users = listUsers(query);

    const formattedUsers = users.map((u) => ({
      ...u,
      roles: u.roles ? JSON.parse(u.roles) : [],
      skills: u.skills ? JSON.parse(u.skills) : [],
    }));

    return NextResponse.json({ users: formattedUsers, count: formattedUsers.length });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
