import { Leaf } from 'lucide-react'

type Glyph = 'leaf' | 'dot' | 'ring'

interface Accent {
  glyph: Glyph
  color: string
  size: number
  top: string
  side: 'start' | 'end'
  offset: string
  rotate?: number
}

/**
 * A handful of small, faint, static doodles (leaves, dots, rings) scattered around the canvas —
 * presence and warmth, not a focal point and not motion. Deliberately not animated: a drifting
 * ambient layer read as busy in an earlier pass. Uses logical `insetInlineStart`/`insetInlineEnd`
 * positioning so it mirrors correctly in RTL. Purely decorative: aria-hidden, pointer-events-none.
 */
const ACCENTS: Accent[] = [
  { glyph: 'leaf', color: '#e8a37f', size: 22, top: '3%', side: 'end', offset: '14%', rotate: 18 },
  { glyph: 'dot', color: '#d8c48a', size: 10, top: '9%', side: 'start', offset: '10%' },
  { glyph: 'ring', color: '#a9b98f', size: 16, top: '22%', side: 'end', offset: '4%' },
  { glyph: 'dot', color: '#e0a89a', size: 14, top: '34%', side: 'start', offset: '-2%' },
  { glyph: 'leaf', color: '#9db98a', size: 18, top: '48%', side: 'start', offset: '6%', rotate: -14 },
  { glyph: 'dot', color: '#e8c98c', size: 18, top: '58%', side: 'end', offset: '-3%' },
  { glyph: 'ring', color: '#e0a89a', size: 14, top: '69%', side: 'start', offset: '2%' },
  { glyph: 'leaf', color: '#d8c48a', size: 20, top: '80%', side: 'end', offset: '10%', rotate: 8 },
]

function renderGlyph(accent: Accent) {
  const style = { width: accent.size, height: accent.size, color: accent.color }

  switch (accent.glyph) {
    case 'leaf':
      return <Leaf style={{ ...style, transform: `rotate(${accent.rotate ?? 0}deg)` }} strokeWidth={1.75} />
    case 'ring':
      return (
        <span
          style={{ ...style, borderColor: accent.color }}
          className="block rounded-full border-[1.5px]"
        />
      )
    default:
      return <span style={{ ...style, background: accent.color }} className="block rounded-full" />
  }
}

export function DoodleAccents() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {ACCENTS.map((accent, index) => (
        <span
          key={index}
          className="absolute opacity-[0.35]"
          style={{
            top: accent.top,
            ...(accent.side === 'start' ? { insetInlineStart: accent.offset } : { insetInlineEnd: accent.offset }),
          }}
        >
          {renderGlyph(accent)}
        </span>
      ))}
    </div>
  )
}
