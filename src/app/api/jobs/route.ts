import { NextRequest, NextResponse } from 'next/server';
import { getAllJobsMeta, getJobMeta, upsertJobMeta } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const meta = getJobMeta(id);
      return NextResponse.json({ found: Boolean(meta), meta });
    }

    const all = getAllJobsMeta();
    return NextResponse.json({ success: true, jobs: all });
  } catch (error: any) {
    console.error('Error fetching jobs meta:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch job metadata' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, category, imageUrl, client } = body;

    if (!id && id !== 0) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const updated = upsertJobMeta({
      id: String(id),
      category: category || 'General',
      imageUrl: imageUrl || null,
      client: client || null,
    });

    return NextResponse.json({ success: true, meta: updated });
  } catch (error: any) {
    console.error('Error saving job meta:', error);
    return NextResponse.json({ error: error.message || 'Failed to save job metadata' }, { status: 500 });
  }
}
