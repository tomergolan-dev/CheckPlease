import { describe, expect, it } from 'vitest'
import {
  deleteOrphanedScanPhotos,
  deleteScanPhotos,
  ORPHAN_PHOTO_AGE_MS,
  readScanPhoto,
  saveScanPhoto,
  scanPhotoPath,
  type PhotoStorage,
  type ScanPhotosRepository,
} from './photos'

interface Row {
  scanId: string
  userId: string
  imagePath: string | null
  createdAt: Date
}

function setup() {
  const files = new Map<string, Buffer>()
  const rows = new Map<string, Row>()
  /** scan ids each user's bills list in `scanPhotoIds` */
  const referenced = new Map<string, Set<string>>()

  const storage: PhotoStorage = {
    async save(path, body) {
      files.set(path, body)
    },
    async remove(paths) {
      for (const path of paths) files.delete(path)
    },
    async read(path) {
      const body = files.get(path)
      if (!body) return null
      return { stream: new Blob([new Uint8Array(body)]).stream(), contentType: 'image/jpeg' }
    },
  }

  const repository: ScanPhotosRepository = {
    async setImagePath(scanId, userId, imagePath) {
      const row = rows.get(scanId)
      if (row && row.userId === userId) row.imagePath = imagePath
    },
    async findOwned(userId, scanIds) {
      return [...rows.values()]
        .filter((row) => row.userId === userId && scanIds.includes(row.scanId) && row.imagePath)
        .map((row) => ({ scanId: row.scanId, imagePath: row.imagePath! }))
    },
    async findOrphaned(before, limit) {
      return [...rows.values()]
        .filter((row) => row.imagePath && row.createdAt < before && !referenced.get(row.userId)?.has(row.scanId))
        .slice(0, limit)
        .map((row) => ({ scanId: row.scanId, imagePath: row.imagePath! }))
    },
    async clearImagePaths(scanIds) {
      for (const scanId of scanIds) {
        const row = rows.get(scanId)
        if (row) row.imagePath = null
      }
    },
  }

  function addScan(scanId: string, userId: string, createdAt = new Date()) {
    rows.set(scanId, { scanId, userId, imagePath: null, createdAt })
  }

  async function addPhoto(scanId: string, userId: string, createdAt = new Date()) {
    addScan(scanId, userId, createdAt)
    await saveScanPhoto({ userId, scanId, imageBase64: 'aGVsbG8=', contentType: 'image/jpeg' }, storage, repository)
  }

  function reference(userId: string, scanId: string) {
    if (!referenced.has(userId)) referenced.set(userId, new Set())
    referenced.get(userId)!.add(scanId)
  }

  return { files, rows, storage, repository, addPhoto, reference }
}

describe('bill photos', () => {
  it('saves a photo under its owner and records where it is', async () => {
    const { files, rows, addPhoto } = setup()
    await addPhoto('scan-1', 'u1')

    expect(files.has(scanPhotoPath('u1', 'scan-1'))).toBe(true)
    expect(rows.get('scan-1')?.imagePath).toBe(scanPhotoPath('u1', 'scan-1'))
  })

  it('shows a photo only to its owner', async () => {
    const { storage, repository, addPhoto } = setup()
    await addPhoto('scan-1', 'u1')

    expect(await readScanPhoto('u1', 'scan-1', storage, repository)).not.toBeNull()
    expect(await readScanPhoto('u2', 'scan-1', storage, repository)).toBeNull()
  })

  it("deletes a retaken photo, but never someone else's", async () => {
    const { files, storage, repository, addPhoto } = setup()
    await addPhoto('scan-1', 'u1')

    expect(await deleteScanPhotos('u2', ['scan-1'], storage, repository)).toBe(0)
    expect(files.size).toBe(1)

    expect(await deleteScanPhotos('u1', ['scan-1'], storage, repository)).toBe(1)
    expect(files.size).toBe(0)
    expect(await readScanPhoto('u1', 'scan-1', storage, repository)).toBeNull()
  })

  it('cleans up old photos no bill uses, and keeps the rest', async () => {
    const { files, storage, repository, addPhoto, reference } = setup()
    const now = new Date('2026-11-10T12:00:00Z')
    const old = new Date(now.getTime() - ORPHAN_PHOTO_AGE_MS - 1000)
    const recent = new Date(now.getTime() - 60_000)

    await addPhoto('old-unused', 'u1', old)
    await addPhoto('old-in-bill', 'u1', old)
    await addPhoto('recent-unused', 'u1', recent)
    reference('u1', 'old-in-bill')

    expect(await deleteOrphanedScanPhotos(now, storage, repository)).toBe(1)
    expect(files.has(scanPhotoPath('u1', 'old-unused'))).toBe(false)
    expect(files.has(scanPhotoPath('u1', 'old-in-bill'))).toBe(true)
    // Too new to judge: its draft may not have synced yet.
    expect(files.has(scanPhotoPath('u1', 'recent-unused'))).toBe(true)
  })

  it('treats a photo listed only in another user\'s bill as unused', async () => {
    const { files, storage, repository, addPhoto, reference } = setup()
    const now = new Date('2026-11-10T12:00:00Z')
    await addPhoto('scan-1', 'u1', new Date(now.getTime() - ORPHAN_PHOTO_AGE_MS - 1000))
    reference('u2', 'scan-1')

    await deleteOrphanedScanPhotos(now, storage, repository)
    expect(files.size).toBe(0)
  })
})
