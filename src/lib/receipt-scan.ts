import type { CurrencyCode } from '@/lib/store/types'

export interface ScannedItem {
  name: string
  quantity: number
  unitPriceMinorUnits: number
}

export type ScanReceiptErrorCode =
  | 'invalid_image'
  | 'server_misconfigured'
  | 'refused'
  | 'upstream_error'
  | 'network_error'

export class ScanReceiptError extends Error {
  code: ScanReceiptErrorCode

  constructor(code: ScanReceiptErrorCode) {
    super(code)
    this.code = code
  }
}

/** Sonnet 5's high-resolution vision tier caps at 2576px on the long edge — stay comfortably under that. */
const MAX_DIMENSION = 2200
const JPEG_QUALITY = 0.9

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

/** Downscales and re-encodes as JPEG so a full-resolution phone photo doesn't ship over the wire untouched. */
async function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) throw new Error('Failed to encode canvas as JPEG')

    return { base64: arrayBufferToBase64(await blob.arrayBuffer()), mediaType: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}

export async function scanReceipt(file: File, currency: CurrencyCode): Promise<ScannedItem[]> {
  let payload: { base64: string; mediaType: string }
  try {
    payload = await compressImage(file)
  } catch {
    throw new ScanReceiptError('invalid_image')
  }

  let response: Response
  try {
    response = await fetch('/api/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: payload.base64, mediaType: payload.mediaType, currency }),
    })
  } catch {
    throw new ScanReceiptError('network_error')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok || !data) {
    const code: ScanReceiptErrorCode =
      data && typeof data.error === 'string' ? (data.error as ScanReceiptErrorCode) : 'upstream_error'
    throw new ScanReceiptError(code)
  }

  return data.items as ScannedItem[]
}
