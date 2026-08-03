import {
  Beef,
  Beer,
  CakeSlice,
  ChefHat,
  Coffee,
  CupSoda,
  Drumstick,
  Fish,
  Hamburger,
  IceCreamCone,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Wine,
} from 'lucide-react'
// Lucide (the project's default icon set) has no fries or noodle-bowl glyph — IconPark's
// outline theme matches Lucide's stroke weight/round caps closely enough to mix in for just
// these two categories rather than forcing an inaccurate Lucide icon onto either dish.
import { FrenchFries, Noodles } from '@icon-park/react'
import { cn } from '@/lib/utils'

type FoodCategory =
  | 'iceCream'
  | 'pizza'
  | 'burger'
  | 'sandwich'
  | 'salad'
  | 'soup'
  | 'pasta'
  | 'fries'
  | 'fish'
  | 'chicken'
  | 'meat'
  | 'cake'
  | 'coffee'
  | 'wine'
  | 'beer'
  | 'soda'
  | 'generic'

/** IconPark icons take an explicit `size` prop rather than sizing via className — this
 * matches Tailwind's `size-5` (1.25rem) used everywhere else in `FoodIcon`. */
const ICON_PARK_SIZE = '1.25rem'

/**
 * Keyword-matched, not user-picked: a dish gets a small supportive icon automatically from its
 * name, in whichever language it was typed (Hebrew or English) — no new input, no photo concept.
 * Order matters — first match wins, so more specific keywords (e.g. "burger" before the broader
 * "sandwich" bucket it would otherwise fall into) are listed before broader ones.
 */
const FOOD_CATEGORY_RULES: { category: FoodCategory; keywords: string[] }[] = [
  { category: 'iceCream', keywords: ['ice cream', 'gelato', 'sorbet', 'גלידה', 'סורבה'] },
  { category: 'pizza', keywords: ['pizza', 'פיצה'] },
  { category: 'burger', keywords: ['burger', 'hamburger', 'cheeseburger', 'המבורגר', 'בורגר'] },
  {
    category: 'sandwich',
    keywords: ['sandwich', 'toast', 'panini', 'sabich', 'כריך', 'טוסט', 'סביח'],
  },
  { category: 'salad', keywords: ['salad', 'greens', 'סלט'] },
  { category: 'soup', keywords: ['soup', 'ramen', 'pho', 'broth', 'מרק'] },
  {
    category: 'pasta',
    keywords: [
      'pasta', 'spaghetti', 'noodle', 'noodles', 'lasagna', 'risotto', 'rice',
      'פסטה', 'ספגטי', 'נודלס', 'לזניה', 'ריזוטו', 'אורז',
    ],
  },
  {
    category: 'fries',
    keywords: ['fries', 'chips', 'טוגנים', "צ'יפס", 'צ׳יפס'],
  },
  {
    category: 'fish',
    keywords: [
      'fish', 'salmon', 'tuna', 'sushi', 'sashimi', 'seafood', 'shrimp', 'calamari',
      'דג', 'דגים', 'סושי', 'סלמון', 'טונה', 'קלמארי', 'שרימפס',
    ],
  },
  {
    category: 'chicken',
    keywords: ['chicken', 'wings', 'turkey', 'עוף', 'כנפיים', 'הודו'],
  },
  {
    category: 'meat',
    keywords: [
      'beef', 'steak', 'meat', 'lamb', 'kebab', 'schnitzel', 'spicy',
      'בשר', 'סטייק', 'כבש', 'קבב', 'שניצל', 'חריף',
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
  burger: 'text-[#a1440c]',
  sandwich: 'text-[#8a6d1f]',
  salad: 'text-[#3f7d20]',
  soup: 'text-[#b45309]',
  pasta: 'text-[#c9971f]',
  fries: 'text-[#d99a2b]',
  fish: 'text-[#0f7490]',
  chicken: 'text-[#b8860b]',
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
    case 'burger':
      return <Hamburger className={iconClassName} aria-hidden="true" />
    case 'sandwich':
      return <Sandwich className={iconClassName} aria-hidden="true" />
    case 'salad':
      return <Salad className={iconClassName} aria-hidden="true" />
    case 'soup':
      return <Soup className={iconClassName} aria-hidden="true" />
    case 'pasta':
      return (
        <Noodles className={iconClassName} size={ICON_PARK_SIZE} theme="outline" aria-hidden="true" />
      )
    case 'fries':
      return (
        <FrenchFries className={iconClassName} size={ICON_PARK_SIZE} theme="outline" aria-hidden="true" />
      )
    case 'fish':
      return <Fish className={iconClassName} aria-hidden="true" />
    case 'chicken':
      return <Drumstick className={iconClassName} aria-hidden="true" />
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
      return <ChefHat className={iconClassName} aria-hidden="true" />
  }
}
