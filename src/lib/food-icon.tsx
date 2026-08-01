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
      'beef', 'steak', 'meat', 'chicken', 'wings', 'lamb', 'kebab', 'schnitzel', 'spicy',
      'בשר', 'סטייק', 'עוף', 'כנפיים', 'כבש', 'קבב', 'שניצל', 'חריף',
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

/** A bare, moderately vivid color per category — a quiet flash of color on the glyph itself,
 * never a badge or circle behind it. */
const CATEGORY_ICON_CLASSES: Record<FoodCategory, string> = {
  iceCream: 'text-[#b23a6b]',
  pizza: 'text-[#c2410c]',
  sandwich: 'text-[#8a6d1f]',
  salad: 'text-[#3f7d20]',
  soup: 'text-[#b45309]',
  fish: 'text-[#0f7490]',
  meat: 'text-[#a6392a]',
  cake: 'text-[#b23a6b]',
  coffee: 'text-[#6b4423]',
  wine: 'text-[#9b2f4a]',
  beer: 'text-[#a67c00]',
  soda: 'text-[#1c7fa3]',
  generic: 'text-muted-foreground',
}

/** Renders the matched icon directly — no badge, no background — each branch is a literal
 * tag, never a stored component reference (required by the `react-hooks/static-components`
 * lint rule). */
export function FoodIcon({ dishName, className }: { dishName: string; className?: string }) {
  const category = matchFoodCategory(dishName)
  const iconClassName = cn('size-5 shrink-0', CATEGORY_ICON_CLASSES[category], className)

  switch (category) {
    case 'iceCream':
      return <IceCreamCone className={iconClassName} aria-hidden="true" />
    case 'pizza':
      return <Pizza className={iconClassName} aria-hidden="true" />
    case 'sandwich':
      return <Sandwich className={iconClassName} aria-hidden="true" />
    case 'salad':
      return <Salad className={iconClassName} aria-hidden="true" />
    case 'soup':
      return <Soup className={iconClassName} aria-hidden="true" />
    case 'fish':
      return <Fish className={iconClassName} aria-hidden="true" />
    case 'meat':
      return <Beef className={iconClassName} aria-hidden="true" />
    case 'cake':
      return <CakeSlice className={iconClassName} aria-hidden="true" />
    case 'coffee':
      return <Coffee className={iconClassName} aria-hidden="true" />
    case 'wine':
      return <Wine className={iconClassName} aria-hidden="true" />
    case 'beer':
      return <Beer className={iconClassName} aria-hidden="true" />
    case 'soda':
      return <CupSoda className={iconClassName} aria-hidden="true" />
    default:
      return <UtensilsCrossed className={iconClassName} aria-hidden="true" />
  }
}
