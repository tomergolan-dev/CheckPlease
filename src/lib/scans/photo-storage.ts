import { and, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm'
import { del, get, put } from '@vercel/blob'
import { db } from '@/lib/db/client'
import { bills, scanAttempts } from '@/lib/db/schema'
import type { PhotoStorage, ScanPhotosRepository } from './photos'

/** Private Vercel Blob: every read goes through our own authenticated route. */
export const blobPhotoStorage: PhotoStorage = {
  async save(path, body, contentType) {
    await put(path, body, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: true })
  },
  async remove(paths) {
    if (paths.length > 0) await del(paths)
  },
  async read(path) {
    const result = await get(path, { access: 'private' })
    if (!result || result.statusCode !== 200) return null
    return { stream: result.stream, contentType: result.blob.contentType }
  },
}

export const drizzleScanPhotosRepository: ScanPhotosRepository = {
  async setImagePath(scanId, userId, imagePath) {
    await db
      .update(scanAttempts)
      .set({ imagePath })
      .where(and(eq(scanAttempts.scanId, scanId), eq(scanAttempts.userId, userId)))
  },

  async findOwned(userId, scanIds) {
    if (scanIds.length === 0) return []
    const rows = await db
      .select({ scanId: scanAttempts.scanId, imagePath: scanAttempts.imagePath })
      .from(scanAttempts)
      .where(
        and(eq(scanAttempts.userId, userId), inArray(scanAttempts.scanId, scanIds), isNotNull(scanAttempts.imagePath))
      )
    return rows.flatMap((row) => (row.imagePath ? [{ scanId: row.scanId, imagePath: row.imagePath }] : []))
  },

  async findOrphaned(before, limit) {
    const rows = await db
      .select({ scanId: scanAttempts.scanId, imagePath: scanAttempts.imagePath })
      .from(scanAttempts)
      .where(
        and(
          isNotNull(scanAttempts.imagePath),
          lt(scanAttempts.createdAt, before),
          sql`not exists (
            select 1 from ${bills}
            where ${bills.userId} = ${scanAttempts.userId}
              and coalesce(${bills.data} -> 'scanPhotoIds', '[]'::jsonb) @> jsonb_build_array(${scanAttempts.scanId})
          )`
        )
      )
      .limit(limit)
    return rows.flatMap((row) => (row.imagePath ? [{ scanId: row.scanId, imagePath: row.imagePath }] : []))
  },

  async clearImagePaths(scanIds) {
    if (scanIds.length === 0) return
    await db.update(scanAttempts).set({ imagePath: null }).where(inArray(scanAttempts.scanId, scanIds))
  },
}
