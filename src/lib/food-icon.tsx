import {
  Beef,
  Beer,
  CakeSlice,
  Coffee,
  CupSoda,
  Fish,
  IceCreamCone,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  Wine,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type FoodCategory =
  | 'iceCream'
  | 'pizza'
  | 'sandwich'
  | 'salad'
  | 'soup'
  | 'fish'
  | 'meat'
  | 'cake'
  | 'coffee'
  | 'wine'
  | 'beer'
  | 'soda'
  | 'generic'

/**
 * Keyword-matched, not user-picked: a dish gets a small supportive icon automatically from its
 * name, in whichever language it was typed (Hebrew or English) — no new input, no photo concept.
 * Order matters — first match wins, so more specific keywords (e.g. "ice cream") are listed
 * before broader ones that could otherwise shadow them.
 */
const FOOD_CATEGORY_RULES: { category: FoodCategory; keywords: string[] }[] = [
  { category: 'iceCream', keywords: ['ice cream', 'gelato', 'sorbet', 'גלידה', 'סורבה'] },
  { category: 'pizza', keywords: ['pizza', 'פיצה'] },
  {
    category: 'sandwich',
    keywords: ['sandwich', 'toast', 'burger', 'sabich', 'כריך', 'טוסט', 'המבורגר', 'בורגר', 'סביח'],
  },
  { category: 'salad', keywords: ['salad', 'greens', 'סלט'] },
  { category: 'soup', keywords: ['soup', 'ramen', 'pho', 'broth', 'מרק'] },
  {
    category: 'fish',
    keywords: [
      'fish', 'salmon', 'tuna', 'sushi', 'sashimi', 'seafood', 'shrimp', 'calamari',
      'דג', 'דגים', 'סושי', 'סלמון', 'טונה', 'קלמארי', 'שרימפס',
    ],
  },
  {
    category: 'meat',
    keywords: [
      'beef', 'steak', 'meat', 'chicken', 'lamb', 'kebab', 'schnitzel',
      'בשר', 'סטייק', 'עוף', 'כבש', 'קבב', 'שניצל',
    ],
  },
  { category: 'cake', keywords: ['cake', 'dessert', 'tiramisu', 'pie', 'עוגה', 'קינוח', 'עוגת'] },
  { category: 'coffee', keywords: ['coffee', 'espresso', 'latte', 'cappuccino', 'קפה', 'אספרסו'] },
  { category: 'wine', keywords: ['wine', 'sangria', 'יין'] },
  { category: 'beer', keywords: ['beer', 'draft', 'lager', 'בירה'] },
  {
    category: 'soda',
    keywords: ['soda', 'juice', 'cola', 'lemonade', 'drink', 'קולה', 'מיץ', 'שתייה', 'לימונדה'],
  },
]

function matchFoodCategory(dishName: string): FoodCategory {
  const normalized = dishName.trim().toLowerCase()
  if (!normalized) return 'generic'

  for (const rule of FOOD_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category
    }
  }

  return 'generic'
}

/** A tinted circle per category — the closest a plain icon gets to a photo's visual variety. */
const CATEGORY_BADGE_CLASSES: Record<FoodCategory, string> = {
  iceCream: 'bg-[#fbdce7] text-[#b23a6b]',
  pizza: 'bg-[#fbe0c4] text-[#c2410c]',
  sandwich: 'bg-[#f6e3c8] text-[#92601f]',
  salad: 'bg-[#dcecc8] text-[#3f7d20]',
  soup: 'bg-[#fde3d0] text-[#b45309]',
  fish: 'bg-[#d8eef0] text-[#0f7490]',
  meat: 'bg-[#f3d9d2] text-[#9f3a2f]',
  cake: 'bg-[#fbdce7] text-[#b23a6b]',
  coffee: 'bg-[#e8dcc8] text-[#6b4423]',
  wine: 'bg-[#f0d7dc] text-[#9b2f4a]',
  beer: 'bg-[#fbe9b8] text-[#a67c00]',
  soda: 'bg-[#d7ecf5] text-[#1c7fa3]',
  generic: 'bg-muted text-muted-foreground',
}

/** Renders the matched icon inside its category's tinted circle — each branch is a literal tag,
 * never a stored component reference (required by the `react-hooks/static-components` lint rule). */
export function FoodIcon({ dishName, className }: { dishName: string; className?: string }) {
  const category = matchFoodCategory(dishName)
  const badgeClassName = cn(
    'flex size-[38px] shrink-0 items-center justify-center rounded-full',
    CATEGORY_BADGE_CLASSES[category],
    className
  )
  const iconClassName = 'size-[18px]'

  switch (category) {
    case 'iceCream':
      return (
        <span className={badgeClassName}>
          <IceCreamCone className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'pizza':
      return (
        <span className={badgeClassName}>
          <Pizza className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'sandwich':
      return (
        <span className={badgeClassName}>
          <Sandwich className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'salad':
      return (
        <span className={badgeClassName}>
          <Salad className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'soup':
      return (
        <span className={badgeClassName}>
          <Soup className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'fish':
      return (
        <span className={badgeClassName}>
          <Fish className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'meat':
      return (
        <span className={badgeClassName}>
          <Beef className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'cake':
      return (
        <span className={badgeClassName}>
          <CakeSlice className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'coffee':
      return (
        <span className={badgeClassName}>
          <Coffee className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'wine':
      return (
        <span className={badgeClassName}>
          <Wine className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'beer':
      return (
        <span className={badgeClassName}>
          <Beer className={iconClassName} aria-hidden="true" />
        </span>
      )
    case 'soda':
      return (
        <span className={badgeClassName}>
          <CupSoda className={iconClassName} aria-hidden="true" />
        </span>
      )
    default:
      return (
        <span className={badgeClassName}>
          <UtensilsCrossed className={iconClassName} aria-hidden="true" />
        </span>
      )
  }
}
