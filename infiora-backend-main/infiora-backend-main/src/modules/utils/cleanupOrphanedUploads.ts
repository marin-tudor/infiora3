/**
 * cleanupOrphanedUploads
 *
 * Scans the local uploads/ directory (excluding uploads/tmp/), collects every
 * file path referenced in the database, then deletes any file that is no
 * longer referenced. Returns the number of deleted files and freed bytes.
 *
 * NOTE: This function is intended to be called by a scheduled job.
 *       See src/modules/scheduler/cleanupOrphanedUploadsJob.ts for the
 *       weekly cron registration.
 *
 * Production note: when files are stored on S3 rather than on disk this
 * function has nothing to clean up locally and exits immediately (the
 * uploads/ directory will not exist or will be empty).
 */

import fs from 'fs';
import path from 'path';
import Room from '../room/room.model';
import Link from '../link/link.model';
import CatalogItem from '../orders/catalog-item.model';
import Hotel from '../hotel/hotel.model';
import logger from '../logger/logger';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Recursively lists all files under `dir`, skipping any subdirectory whose
 * name matches `skipDir` (case-sensitive, matched against the direct child
 * name only).
 */
function listFiles(dir: string, skipDir: string): string[] {
  let results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === skipDir) continue;
      results = results.concat(listFiles(fullPath, skipDir));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Converts a DB-stored URL such as `/v1/uploads/dev/rooms/uuid.jpg` into the
 * absolute file-system path `<cwd>/uploads/dev/rooms/uuid.jpg`.
 * Returns null for S3 URLs or anything that is not a local upload path.
 */
function urlToAbsolutePath(url: unknown): string | null {
  if (typeof url !== 'string' || url.trim() === '') return null;
  if (!url.startsWith('/v1/uploads/')) return null;
  // Strip the /v1/ prefix so we get uploads/dev/...
  const relative = url.slice('/v1/'.length);
  return path.join(process.cwd(), relative);
}

/** Collects every referenced local file path from all DB collections. */
async function collectReferencedPaths(): Promise<Set<string>> {
  const referenced = new Set<string>();

  const add = (url: unknown) => {
    const p = urlToAbsolutePath(url);
    if (p) referenced.add(p);
  };

  // ── Hotels ─────────────────────────────────────────────────────────────────
  const hotels = await Hotel.find({}, 'image cover mapPoints').lean();
  for (const hotel of hotels) {
    add(hotel.image);
    add(hotel.cover);
    for (const point of hotel.mapPoints ?? []) {
      add(point.image);
      add(point.customIconImage);
    }
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const rooms = await Room.find({}, 'background popup newsletter survey').lean();
  for (const room of rooms) {
    add(room.background?.image);
    add(room.popup?.image);
    add(room.newsletter?.image);
    add(room.survey?.image);
  }

  // ── Links ──────────────────────────────────────────────────────────────────
  const links = await Link.find({}, 'image imageType sections').lean();
  for (const link of links) {
    add(link.image);
    for (const section of link.sections ?? []) {
      for (const img of section.images ?? []) {
        add(img);
      }
    }
  }

  // ── Catalog items ──────────────────────────────────────────────────────────
  const catalogItems = await CatalogItem.find({ imageType: 'upload' }, 'image').lean();
  for (const item of catalogItems) {
    add(item.image);
  }

  return referenced;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function cleanupOrphanedUploads(): Promise<{ deleted: number; freed: number }> {
  const uploadsDir = path.join(process.cwd(), 'uploads');

  // If the uploads directory does not exist there is nothing to do.
  if (!fs.existsSync(uploadsDir)) {
    logger.info('cleanupOrphanedUploads: uploads/ directory not found, skipping.');
    return { deleted: 0, freed: 0 };
  }

  // Gather all files on disk (skip the tmp staging directory).
  const diskFiles = listFiles(uploadsDir, 'tmp');
  if (diskFiles.length === 0) {
    logger.info('cleanupOrphanedUploads: no files found in uploads/ (excluding tmp).');
    return { deleted: 0, freed: 0 };
  }

  // Gather all referenced paths from the database.
  let referencedPaths: Set<string>;
  try {
    referencedPaths = await collectReferencedPaths();
  } catch (err) {
    logger.error('cleanupOrphanedUploads: failed to query DB, aborting to avoid data loss.', err);
    return { deleted: 0, freed: 0 };
  }

  let deleted = 0;
  let freed = 0;

  for (const filePath of diskFiles) {
    if (referencedPaths.has(filePath)) continue; // still in use

    try {
      const stat = fs.statSync(filePath);
      fs.unlinkSync(filePath);
      freed += stat.size;
      deleted++;
      logger.debug(`cleanupOrphanedUploads: deleted orphan ${filePath}`);
    } catch (err) {
      logger.warn(`cleanupOrphanedUploads: could not delete ${filePath}: ${err}`);
    }
  }

  logger.info(
    `cleanupOrphanedUploads: removed ${deleted} orphaned file(s), freed ${(freed / 1024).toFixed(1)} KB.`
  );

  return { deleted, freed };
}
