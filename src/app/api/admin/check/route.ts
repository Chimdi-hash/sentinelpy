import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = (searchParams.get('address') || '').toLowerCase().trim();

    const adminAddress = (
      process.env.ADMIN_WALLET_ADDRESS ||
      process.env.NEXT_PUBLIC_ADMIN_ADDRESS ||
      ''
    ).toLowerCase().trim();

    const isAdmin = Boolean(address && adminAddress && address === adminAddress);

    // Only return boolean flag, never reveal the secret admin address to the client
    return NextResponse.json({ isAdmin });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
