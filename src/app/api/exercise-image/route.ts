import { NextRequest, NextResponse } from 'next/server';

// In-process GIF cache — survives across requests, cleared on server restart
const cache = new Map<string, Buffer>();

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const key = process.env.RAPIDAPI_KEY;
  if (!key) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  if (cache.has(id)) {
    return new NextResponse(new Uint8Array(cache.get(id)!), {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'public, max-age=2592000',
      },
    });
  }

  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/image?exerciseId=${id}&resolution=360`,
    {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    }
  );

  if (!res.ok) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[exercise-image] id="${id}" → ${res.status}`);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  cache.set(id, buffer);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[exercise-image] id="${id}" → ${buffer.length} bytes`);
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'public, max-age=2592000',
    },
  });
}
