/**
 * SSRF guard tests for assertSafeRemoteUrl() in ical-sync.service.ts.
 *
 * assertSafeRemoteUrl() is the function that validates iCal feed URLs before
 * the backend performs any outbound HTTP request. It must reject:
 *   - non-https schemes
 *   - literal private / loopback IPv4 ranges
 *   - link-local addresses (169.254.x.x)
 *   - the AWS metadata endpoint (169.254.169.254)
 *   - hostnames that DNS-resolve to private IPs  (tested via dns.lookup mock)
 *
 * Valid public https URLs must resolve to a URL object without throwing.
 */

// Prevent real DNS lookups; we control resolution via the mock below.
jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

// node-ical is an ESM package that breaks Jest — mock it at module level
jest.mock('node-ical', () => ({
  async: { fromURL: jest.fn() },
}));

// Mongoose models are not needed for unit-testing the pure URL validator
jest.mock('../ical-source.model', () => ({ __esModule: true, default: {} }));
jest.mock('../reservation-code.model', () => ({ __esModule: true, default: {} }));
jest.mock('../../logger/logger', () => ({ info: jest.fn(), error: jest.fn() }));

import dns from 'node:dns/promises';
import { assertSafeRemoteUrl } from '../ical-sync.service';
import ApiError from '../../errors/ApiError';

const mockDns = dns as jest.Mocked<typeof dns>;

/** Helper: configure the dns mock to return a set of IP addresses. */
const mockDnsResolves = (addresses: string[]) => {
  mockDns.lookup.mockResolvedValue(
    addresses.map((address) => ({ address, family: 4 })) as any
  );
};

/** Helper: configure the dns mock to resolve with a safe public IP. */
const mockDnsPublic = () => mockDnsResolves(['93.184.216.34']); // example.com

describe('assertSafeRemoteUrl — SSRF guards', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('scheme validation', () => {
    it('should reject file:// URLs', async () => {
      await expect(assertSafeRemoteUrl('file:///etc/passwd')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject ftp:// URLs', async () => {
      await expect(assertSafeRemoteUrl('ftp://example.com/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject http:// URLs', async () => {
      await expect(assertSafeRemoteUrl('http://example.com/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject completely invalid URLs', async () => {
      await expect(assertSafeRemoteUrl('not-a-url')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('loopback addresses', () => {
    it('should reject 127.0.0.1', async () => {
      await expect(assertSafeRemoteUrl('https://127.0.0.1/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject localhost hostname', async () => {
      await expect(assertSafeRemoteUrl('https://localhost/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject 127.x.x.x range', async () => {
      await expect(assertSafeRemoteUrl('https://127.0.0.2/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('private IPv4 ranges', () => {
    it('should reject 10.x.x.x as literal IP', async () => {
      await expect(assertSafeRemoteUrl('https://10.0.0.1/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject 192.168.x.x as literal IP', async () => {
      await expect(assertSafeRemoteUrl('https://192.168.1.1/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject 172.16.x.x as literal IP', async () => {
      await expect(assertSafeRemoteUrl('https://172.16.0.1/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject 172.31.x.x as literal IP', async () => {
      await expect(assertSafeRemoteUrl('https://172.31.255.255/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('link-local and metadata addresses', () => {
    it('should reject 169.254.x.x (link-local) as literal IP', async () => {
      await expect(assertSafeRemoteUrl('https://169.254.1.1/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject the AWS metadata endpoint 169.254.169.254', async () => {
      await expect(assertSafeRemoteUrl('https://169.254.169.254/latest/meta-data/')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('DNS-resolved private IPs', () => {
    it('should reject a public hostname that resolves to a private IP', async () => {
      mockDnsResolves(['10.0.0.5']);
      await expect(assertSafeRemoteUrl('https://internal.calendar.example.com/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject a hostname resolving to a link-local address', async () => {
      mockDnsResolves(['169.254.169.254']);
      await expect(assertSafeRemoteUrl('https://metadata.example.com/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });

    it('should reject a hostname resolving to 192.168.x.x', async () => {
      mockDnsResolves(['192.168.100.200']);
      await expect(assertSafeRemoteUrl('https://sneaky.example.com/cal.ics')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('valid public URLs', () => {
    it('should allow a valid public https URL', async () => {
      mockDnsPublic();
      const result = await assertSafeRemoteUrl('https://calendar.example.com/feed.ics');
      expect(result).toBeInstanceOf(URL);
      expect(result.hostname).toBe('calendar.example.com');
    });

    it('should allow https://example.com without a path', async () => {
      mockDnsPublic();
      const result = await assertSafeRemoteUrl('https://example.com');
      expect(result).toBeInstanceOf(URL);
    });

    it('should allow a URL with query parameters', async () => {
      mockDnsPublic();
      const result = await assertSafeRemoteUrl('https://airbnb.com/calendar/ical/12345.ics?token=abc');
      expect(result).toBeInstanceOf(URL);
    });
  });

  describe('DNS failures', () => {
    it('should reject when DNS resolution fails', async () => {
      mockDns.lookup.mockRejectedValue(new Error('lookup failed'));
      await expect(assertSafeRemoteUrl('https://calendar.example.com/feed.ics')).rejects.toBeInstanceOf(ApiError);
    });
  });
});
