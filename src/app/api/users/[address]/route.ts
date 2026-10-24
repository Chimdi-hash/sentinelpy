import { NextRequest, NextResponse } from 'next/server';
import { getUser, upsertUser } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
    }

    const user = getUser(address);

    if (!user) {
      return NextResponse.json({ found: false, address: address.toLowerCase() }, { status: 200 });
    }

    return NextResponse.json({
      found: true,
      user: {
        ...user,
        roles: user.roles ? JSON.parse(user.roles) : [],
        skills: user.skills ? JSON.parse(user.skills) : [],
        portfolio: user.portfolio ? JSON.parse(user.portfolio) : [],
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      displayName,
      avatarUrl,
      headline,
      bio,
      roles,
      skills,
      portfolio,
      linkedin,
      twitter,
      github,
      email,
      website,
    } = body;

    const updatedUser = upsertUser({
      address,
      displayName: displayName || null,
      avatarUrl: avatarUrl || null,
      headline: headline || null,
      bio: bio || null,
      roles: roles ? JSON.stringify(roles) : null,
      skills: skills ? JSON.stringify(skills) : null,
      portfolio: portfolio ? JSON.stringify(portfolio) : null,
      linkedin: linkedin || null,
      twitter: twitter || null,
      github: github || null,
      email: email || null,
      website: website || null,
    });

    if (!updatedUser) {
      throw new Error('Failed to save user record');
    }

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        roles: updatedUser.roles ? JSON.parse(updatedUser.roles) : [],
        skills: updatedUser.skills ? JSON.parse(updatedUser.skills) : [],
        portfolio: updatedUser.portfolio ? JSON.parse(updatedUser.portfolio) : [],
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
  }
}
