import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const allowedImageHosts = new Set(
  [
    ...(apiUrl ? [new URL(apiUrl).hostname] : []),
    ...(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS || '')
      .split(',')
      .map(host => host.trim().toLowerCase())
      .filter(Boolean),
  ],
);
const blockedHosts = new Set(['localhost', '127.0.0.1', '::1', '169.254.169.254']);

const isPrivateIpv4 = (ip: string) => {
  const [a, b] = ip.split('.').map(Number);
  if ([a, b].some(part => Number.isNaN(part))) return false;
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};

const isBlockedIp = (ip: string) => {
  if (net.isIP(ip) === 4) return isPrivateIpv4(ip);
  if (net.isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
  }
  return false;
};

const isAllowedTarget = async (targetUrl: URL) => {
  const hostname = targetUrl.hostname.toLowerCase();

  if (!allowedImageHosts.has(hostname) || blockedHosts.has(hostname)) {
    return false;
  }

  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    return false;
  }

  try {
    const resolved = await dns.lookup(hostname, { all: true });
    return !resolved.some(record => isBlockedIp(record.address));
  } catch {
    return false;
  }
};

const readLimitedBody = async (response: Response) => {
  const reader = response.body?.getReader();

  if (!reader) {
    return null;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    total += value.byteLength;

    if (total > MAX_IMAGE_BYTES) {
      throw new Error('Image too large');
    }

    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;

  chunks.forEach(chunk => {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return merged;
};

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url');

  if (!rawUrl) {
    return new NextResponse(null, { status: 400 });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(decodeURIComponent(rawUrl));
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return new NextResponse(null, { status: 400 });
  }

  if (!(await isAllowedTarget(targetUrl))) {
    return new NextResponse(null, { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      redirect: 'error',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InfioraGuide/1.0)' },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const contentType = res.headers.get('content-type') ?? '';
    const contentLength = Number(res.headers.get('content-length') ?? '0');

    if (!contentType.toLowerCase().startsWith('image/')) {
      return new NextResponse(null, { status: 415 });
    }

    if (contentLength > MAX_IMAGE_BYTES) {
      return new NextResponse(null, { status: 413 });
    }

    const body = await readLimitedBody(res);

    if (!body) {
      return new NextResponse(null, { status: 502 });
    }

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
