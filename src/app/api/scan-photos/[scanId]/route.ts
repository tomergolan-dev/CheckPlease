import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isPhotoStorageConfigured, readScanPhoto } from '@/lib/scans/photos'
import { blobPhotoStorage, drizzleScanPhotosRepository } from '@/lib/scans/photo-storage'

export const runtime = 'nodejs'

/**
 * Streams a bill photo to its owner. The photo sits in private storage, so this route is the only
 * way to see it; someone else's scan id answers exactly like a missing one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isPhotoStorageConfigured()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { scanId } = await params
  const photo = await readScanPhoto(session.user.id, scanId, blobPhotoStorage, drizzleScanPhotosRepository)
  if (!photo) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return new Response(photo.stream, {
    headers: {
      'Content-Type': photo.contentType,
      // Private to this browser: a shared cache must never hold someone's bill photo.
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
