import Room from '../room/room.model';
import Link from '../link/link.model';
import CatalogItem from '../orders/catalog-item.model';
import Hotel from '../hotel/hotel.model';

export const MAX_UPLOADS_PER_HOTEL = 200; // files

/**
 * Returns true when the string looks like an uploaded file rather than an
 * emoji, a blank value or an arbitrary external URL entered by the user.
 * Local dev uploads have the form /v1/uploads/... and production uploads
 * live on S3 (amazonaws.com).
 */
function isUploadedFile(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim() === '') return false;
  return value.startsWith('/v1/uploads/') || value.includes('amazonaws.com');
}

/**
 * Counts every uploaded-file reference that belongs to a hotel across:
 *  - the hotel document itself  (image, cover, mapPoints images)
 *  - all rooms owned by the hotel (background, popup, newsletter, survey images)
 *  - all links belonging to those rooms (image + section images)
 *  - all catalog items for the hotel where imageType === 'upload'
 *
 * Returns { allowed, current, max }.
 */
export async function checkHotelUploadQuota(
  hotelId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  // Run all three queries in parallel for speed.
  const [hotel, rooms, links, catalogItems] = await Promise.all([
    Hotel.findById(hotelId).lean(),
    Room.find({ hotel: hotelId }).lean(),
    // Fetch links for every room that belongs to this hotel.
    // We join via room → hotel using a sub-query on the room ids.
    (async () => {
      const roomIds = (await Room.find({ hotel: hotelId }, '_id').lean()).map((r) => r._id);
      return Link.find({ room: { $in: roomIds } }).lean();
    })(),
    CatalogItem.find({ hotelId, imageType: 'upload' }, 'image').lean(),
  ]);

  let count = 0;

  // ── Hotel-level images ─────────────────────────────────────────────────────
  if (hotel) {
    if (isUploadedFile(hotel.image)) count++;
    if (isUploadedFile(hotel.cover)) count++;
    for (const point of hotel.mapPoints ?? []) {
      if (isUploadedFile(point.image)) count++;
      if (isUploadedFile(point.customIconImage)) count++;
    }
  }

  // ── Room images ────────────────────────────────────────────────────────────
  for (const room of rooms) {
    if (isUploadedFile(room.background?.image)) count++;
    if (isUploadedFile(room.popup?.image)) count++;
    if (isUploadedFile(room.newsletter?.image)) count++;
    if (isUploadedFile(room.survey?.image)) count++;
  }

  // ── Link images ────────────────────────────────────────────────────────────
  for (const link of links) {
    // Only count when imageType indicates an actual uploaded file.
    if ((link.imageType === 'image' || link.imageType === 'url') && isUploadedFile(link.image)) {
      count++;
    }
    for (const section of link.sections ?? []) {
      for (const img of section.images ?? []) {
        if (isUploadedFile(img)) count++;
      }
    }
  }

  // ── Catalog item images ────────────────────────────────────────────────────
  // imageType === 'upload' is already filtered in the query.
  for (const item of catalogItems) {
    if (isUploadedFile(item.image)) count++;
  }

  return {
    allowed: count < MAX_UPLOADS_PER_HOTEL,
    current: count,
    max: MAX_UPLOADS_PER_HOTEL,
  };
}
