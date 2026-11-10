/**
 * Original bill photos for scans whose dishes reached a bill (see "Bill photos" under Receipt
 * Scanning in CLAUDE.md). Photos live in private Blob storage, never behind a public URL: the only
 * way to see one is `readScanPhoto`, which checks the signed-in owner first.
 *
 * Storage and database access are injected so the lifecycle rules can be tested without either.
 */

/** Unused photos older than this are deleted: long enough for a draft to sync after the scan. */
export const ORPHAN_PHOTO_AGE_MS = 24 * 60 * 60 * 1000
/** Caps one cleanup pass, so it never delays the request it runs after. */
export const ORPHAN_CLEANUP_BATCH = 25

export interface PhotoStorage {
  save(path: string, body: Buffer, contentType: string): Promise<void>
  remove(paths: string[]): Promise<void>
  read(path: string): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null>
}

export interface ScanPhotoRecord {
  scanId: string
  imagePath: string
}

export interface ScanPhotosRepository {
  setImagePath(scanId: string, userId: string, imagePath: string): Promise<void>
  /** Only rows owned by `userId` that still have a photo. */
  findOwned(userId: string, scanIds: string[]): Promise<ScanPhotoRecord[]>
  /** Photos older than `before` that no bill of their owner lists in `scanPhotoIds`. */
  findOrphaned(before: Date, limit: number): Promise<ScanPhotoRecord[]>
  clearImagePaths(scanIds: string[]): Promise<void>
}

export function scanPhotoPath(userId: string, scanId: string): string {
  return `scan-photos/${userId}/${scanId}.jpg`
}

/** Photos are an extra: without a configured store, scanning works exactly as before. */
export function isPhotoStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

export async function saveScanPhoto(
  input: { userId: string; scanId: string; imageBase64: string; contentType: string },
  storage: PhotoStorage,
  repository: ScanPhotosRepository
): Promise<void> {
  const path = scanPhotoPath(input.userId, input.scanId)
  await storage.save(path, Buffer.from(input.imageBase64, 'base64'), input.contentType)
  await repository.setImagePath(input.scanId, input.userId, path)
}

/** Deletes the given scans' photos, but only the ones `userId` owns. */
export async function deleteScanPhotos(
  userId: string,
  scanIds: string[],
  storage: PhotoStorage,
  repository: ScanPhotosRepository
): Promise<number> {
  if (scanIds.length === 0) return 0
  const owned = await repository.findOwned(userId, scanIds)
  return removeRecords(owned, storage, repository)
}

export async function deleteOrphanedScanPhotos(
  now: Date,
  storage: PhotoStorage,
  repository: ScanPhotosRepository
): Promise<number> {
  const orphaned = await repository.findOrphaned(new Date(now.getTime() - ORPHAN_PHOTO_AGE_MS), ORPHAN_CLEANUP_BATCH)
  return removeRecords(orphaned, storage, repository)
}

export async function readScanPhoto(
  userId: string,
  scanId: string,
  storage: PhotoStorage,
  repository: ScanPhotosRepository
) {
  const [record] = await repository.findOwned(userId, [scanId])
  if (!record) return null
  return storage.read(record.imagePath)
}

async function removeRecords(records: ScanPhotoRecord[], storage: PhotoStorage, repository: ScanPhotosRepository) {
  if (records.length === 0) return 0
  // Storage first: if it fails, the rows keep their paths and a later pass retries them.
  await storage.remove(records.map((record) => record.imagePath))
  await repository.clearImagePaths(records.map((record) => record.scanId))
  return records.length
}
