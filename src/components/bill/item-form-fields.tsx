'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Stepper } from '@/components/shared/stepper'

interface ItemFormFieldsProps {
  name: string
  onNameChange: (name: string) => void
  priceValue: string
  onPriceChange: (value: string) => void
  onPriceBlur: () => void
  quantity: number
  onQuantityChange: (quantity: number) => void
}

export function ItemFormFields({
  name,
  onNameChange,
  priceValue,
  onPriceChange,
  onPriceBlur,
  quantity,
  onQuantityChange,
}: ItemFormFieldsProps) {
  const t = useTranslations('Items')

  return (
    <div className="flex flex-col gap-4 px-7">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{t('nameLabel')}</span>
        <Input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('namePlaceholder')}
        />
      </label>

      <div className="flex items-end gap-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{t('priceLabel')}</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm text-muted-foreground">
              ₪
            </span>
            <Input
              inputMode="decimal"
              value={priceValue}
              onChange={(e) => onPriceChange(e.target.value)}
              onBlur={onPriceBlur}
              className="ps-7"
            />
          </div>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{t('quantityLabel')}</span>
          <Stepper value={quantity} onChange={onQuantityChange} label={t('quantityLabel')} />
        </div>
      </div>
    </div>
  )
}
