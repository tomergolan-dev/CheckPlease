import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'
import { BRAND_NAME } from '@/lib/brand'

/**
 * The link preview shown when the app is shared (LinkedIn, WhatsApp, iMessage). Built from code in
 * the app's own palette, per locale, so it never drifts from the product. Generated at build time.
 */
export const alt = BRAND_NAME
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const COLORS = {
  background: '#fcfcfc',
  card: '#ffffff',
  border: '#e6e6e6',
  foreground: '#2b2620',
  muted: '#948a7a',
  primary: '#d9722f',
  accent: '#f8e7d6',
}

/** Sample people for the illustrated bill: avatar gradient and amount color from the diner palette. */
const DINERS = [
  { from: '#93c5f5', to: '#4f9ee0', text: '#2563eb', amount: '₪86' },
  { from: '#92e0c0', to: '#34c98f', text: '#10b981', amount: '₪64' },
  { from: '#d3bdf5', to: '#a875e8', text: '#7c3aed', amount: '₪93' },
]

/** Heebo, the app's typeface, limited to the characters drawn, so the download stays tiny. */
async function loadHeebo(weight: number, text: string): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Heebo:wght@${weight}&text=${encodeURIComponent(text)}`)).text()
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
  if (!url) throw new Error('opengraph-image: could not load the Heebo font')
  return (await fetch(url)).arrayBuffer()
}

/**
 * The image renderer (Satori) lays text out left to right only, so Hebrew would come out mirrored.
 * These strings are plain Hebrew words and punctuation (no Latin or digits), so reversing the
 * characters gives the right visual order.
 */
function visualOrder(text: string, rtl: boolean) {
  return rtl ? [...text].reverse().join('') : text
}

/**
 * Splits a sentence into two lines of similar length at a word boundary. Done here rather than by
 * the renderer's own wrapping, which would put a reversed Hebrew sentence's end on the first line.
 */
function twoLines(text: string): string[] {
  const words = text.split(' ')
  let best = 1
  for (let i = 1; i < words.length; i++) {
    const diff = (index: number) => Math.abs(words.slice(0, index).join(' ').length - words.slice(index).join(' ').length)
    if (diff(i) < diff(best)) best = i
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')].filter(Boolean)
}

function ReceiptIcon({ size: px }: { size: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" />
      <path d="M14 8H8" />
      <path d="M16 12H8" />
      <path d="M13 16H8" />
    </svg>
  )
}

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Share' })
  const rtl = locale === 'he'
  const taglineLines = twoLines(t('tagline')).map((line) => visualOrder(line, rtl))
  const taglineSub = visualOrder(t('taglineSub'), rtl)
  const totalLabel = visualOrder(t('totalToPay'), rtl)

  const allText = `${BRAND_NAME}${taglineLines.join('')}${taglineSub}${totalLabel}₪0123456789`
  const [regular, bold] = await Promise.all([loadHeebo(500, allText), loadHeebo(800, allText)])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: rtl ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 96px',
        background: COLORS.background,
        fontFamily: 'Heebo',
        color: COLORS.foreground,
      }}
    >
      {/* Brand and tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: rtl ? 'flex-end' : 'flex-start', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 84,
              height: 84,
              borderRadius: 26,
              background: COLORS.accent,
              boxShadow: '0 6px 18px rgba(20,20,20,0.08)',
            }}
          >
            <ReceiptIcon size={44} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>{BRAND_NAME}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: rtl ? 'flex-end' : 'flex-start' }}>
          {taglineLines.map((line) => (
            <div key={line} style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1.5 }}>
              {line}
            </div>
          ))}
          <div style={{ marginTop: 18, fontSize: 34, fontWeight: 500, color: COLORS.primary }}>{taglineSub}</div>
        </div>
      </div>

      {/* A small illustrated bill: who pays what, and the total */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 360,
          padding: 32,
          gap: 20,
          borderRadius: 36,
          background: COLORS.card,
          border: `2px solid ${COLORS.border}`,
          boxShadow: '0 24px 60px rgba(20,20,20,0.10)',
          transform: rtl ? 'rotate(3deg)' : 'rotate(-3deg)',
        }}
      >
        {DINERS.map((diner) => (
          <div key={diner.amount} style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${diner.from}, ${diner.to})`,
              }}
            />
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 8 }}>
              <div
                style={{ height: 12, width: '70%', borderRadius: 6, background: '#efe9e1', alignSelf: rtl ? 'flex-end' : 'flex-start' }}
              />
              <div
                style={{ height: 10, width: '45%', borderRadius: 5, background: '#f4efe9', alignSelf: rtl ? 'flex-end' : 'flex-start' }}
              />
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: diner.text }}>{diner.amount}</div>
          </div>
        ))}
        <div style={{ height: 0, borderTop: `2px dashed ${COLORS.border}`, margin: '4px 0' }} />
        <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 24, fontWeight: 500, color: COLORS.muted }}>{totalLabel}</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.primary }}>₪243</div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Heebo', data: regular, weight: 500, style: 'normal' },
        { name: 'Heebo', data: bold, weight: 800, style: 'normal' },
      ],
    }
  )
}
