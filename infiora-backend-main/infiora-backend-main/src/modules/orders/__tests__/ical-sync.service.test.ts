// Mock node-ical and Mongoose models so Jest (CJS) can load the module
// without tripping over ESM dependencies (rrule-temporal)
jest.mock('node-ical', () => ({
  async: { fromURL: jest.fn() },
}));
jest.mock('../ical-source.model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
  },
}));
jest.mock('../reservation-code.model', () => ({
  __esModule: true,
  default: {
    bulkWrite: jest.fn(),
  },
}));
jest.mock('../../logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

import { extractCodeFromUid, extractGuestName, isBlockedEvent, syncICalSource } from '../ical-sync.service';

describe('ical-sync.service helpers', () => {
  describe('isBlockedEvent', () => {
    it('returns true for "Not available"', () => {
      expect(isBlockedEvent('Not available')).toBe(true);
    });
    it('returns true for "CLOSED"', () => {
      expect(isBlockedEvent('CLOSED')).toBe(true);
    });
    it('returns false for a real reservation summary', () => {
      expect(isBlockedEvent('HMXYZ123 - John Smith (Airbnb)')).toBe(false);
    });
    it('returns false for undefined', () => {
      expect(isBlockedEvent(undefined)).toBe(false);
    });
  });

  describe('extractCodeFromUid', () => {
    it('extracts numeric ID from booking.com UID', () => {
      expect(extractCodeFromUid('booking-9876543210@booking.com', 'booking')).toBe('9876543210');
    });
    it('extracts HM code from airbnb UID', () => {
      expect(extractCodeFromUid('Airbnb_HMABCDEF123', 'airbnb')).toBe('HMABCDEF123');
    });
    it('returns cleaned UID for custom platform', () => {
      expect(extractCodeFromUid('uid-abc123@vrbo.com', 'vrbo')).toBe('UID-ABC123-VRBO-COM');
    });
  });

  describe('extractGuestName', () => {
    it('extracts name from Airbnb SUMMARY', () => {
      expect(extractGuestName('HMXYZ - John Smith (Airbnb)')).toBe('John Smith');
    });
    it('returns empty string if no summary', () => {
      expect(extractGuestName(undefined)).toBe('');
    });
    it('returns empty string for non-Airbnb summaries', () => {
      expect(extractGuestName('BK1234 - Maria Novak')).toBe('');
    });
  });
});

describe('syncICalSource', () => {
  it('returns early with zero counts when source is not found', async () => {
    const mockICalSource = require('../ical-source.model').default;
    mockICalSource.findById.mockResolvedValueOnce(null);
    const result = await syncICalSource('nonexistent-id');
    expect(result).toEqual({ synced: 0, errors: 0 });
  });

  it('returns early with zero counts when source is disabled', async () => {
    const mockICalSource = require('../ical-source.model').default;
    mockICalSource.findById.mockResolvedValueOnce({ enabled: false });
    const result = await syncICalSource('disabled-id');
    expect(result).toEqual({ synced: 0, errors: 0 });
  });

  it('returns error count when fetch fails', async () => {
    const mockICalSource = require('../ical-source.model').default;
    mockICalSource.findById.mockResolvedValueOnce({
      enabled: true,
      hotelId: 'hotel-1',
      platform: 'airbnb',
      url: 'https://example.com/cal.ics',
    });
    const mockIcal = require('node-ical');
    mockIcal.async.fromURL.mockRejectedValueOnce(new Error('Network error'));
    mockICalSource.findByIdAndUpdate.mockResolvedValueOnce(null);
    const result = await syncICalSource('error-id');
    expect(result).toEqual({ synced: 0, errors: 1 });
  });
});
