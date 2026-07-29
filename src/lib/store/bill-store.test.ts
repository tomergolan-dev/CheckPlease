import { beforeEach, describe, expect, it } from 'vitest'
import { useBillStore } from './bill-store'
import { getDinerDefaultPositions } from './selectors'

beforeEach(() => {
  useBillStore.setState({ bill: null })
})

function start() {
  useBillStore.getState().startNewBill()
}

describe('startNewBill', () => {
  it('creates an empty bill with the expected defaults', () => {
    start()
    const { bill } = useBillStore.getState()
    expect(bill).toMatchObject({
      currency: 'ILS',
      roundUpPayments: false,
      diners: [],
      items: [],
      tip: { mode: 'percentage', valueBasisPoints: 0 },
    })
  })
})

describe('addDiner', () => {
  it('appends a diner with partySize 1 and a sequential palette color', () => {
    start()
    const { addDiner } = useBillStore.getState()
    const id1 = addDiner()
    const id2 = addDiner()

    const { bill } = useBillStore.getState()
    expect(bill!.diners).toEqual([
      { id: id1, partySize: 1, color: 'blue' },
      { id: id2, partySize: 1, color: 'green' },
    ])
  })

  it('adds the new diner to every existing item by default', () => {
    start()
    const store = useBillStore.getState()
    const d1 = store.addDiner()
    store.addItem({ name: 'Pizza', unitPriceMinorUnits: 5000 })
    const d2 = store.addDiner()

    const { bill } = useBillStore.getState()
    expect(bill!.items[0]!.sharedBy).toEqual([d1, d2])
  })

  it('does not touch existing items when includeInExistingItems is false', () => {
    start()
    const store = useBillStore.getState()
    const d1 = store.addDiner()
    store.addItem({ name: 'Pizza', unitPriceMinorUnits: 5000 })
    store.addDiner({ includeInExistingItems: false })

    const { bill } = useBillStore.getState()
    expect(bill!.items[0]!.sharedBy).toEqual([d1])
  })
})

describe('renameDiner', () => {
  it('sets a custom name', () => {
    start()
    const store = useBillStore.getState()
    const id = store.addDiner()
    store.renameDiner(id, 'Daniel & Dana')
    expect(useBillStore.getState().bill!.diners[0]!.name).toBe('Daniel & Dana')
  })

  it('clears back to the default label when renamed to an empty string', () => {
    start()
    const store = useBillStore.getState()
    const id = store.addDiner()
    store.renameDiner(id, 'Daniel & Dana')
    store.renameDiner(id, '   ')
    expect(useBillStore.getState().bill!.diners[0]!.name).toBeUndefined()
  })
})

describe('setDinerPartySize', () => {
  it('clamps to a minimum of 1', () => {
    start()
    const store = useBillStore.getState()
    const id = store.addDiner()
    store.setDinerPartySize(id, 0)
    expect(useBillStore.getState().bill!.diners[0]!.partySize).toBe(1)
    store.setDinerPartySize(id, 4)
    expect(useBillStore.getState().bill!.diners[0]!.partySize).toBe(4)
  })
})

describe('addItem / updateItem / removeItem', () => {
  it('defaults quantity to 1 and assigns every current diner', () => {
    start()
    const store = useBillStore.getState()
    const d1 = store.addDiner()
    const d2 = store.addDiner()
    store.addItem({ name: 'Pizza', unitPriceMinorUnits: 5000 })

    const item = useBillStore.getState().bill!.items[0]!
    expect(item.quantity).toBe(1)
    expect(item.sharedBy).toEqual([d1, d2])
    expect(item.source).toBe('manual')
  })

  it('keeps sortIndex increasing and stable across deletions', () => {
    start()
    const store = useBillStore.getState()
    store.addItem({ name: 'A', unitPriceMinorUnits: 100 })
    store.addItem({ name: 'B', unitPriceMinorUnits: 200 })
    const thirdId = store.addItem({ name: 'C', unitPriceMinorUnits: 300 })

    store.removeItem(useBillStore.getState().bill!.items[0]!.id) // remove "A"
    store.addItem({ name: 'D', unitPriceMinorUnits: 400 })

    const items = useBillStore.getState().bill!.items
    const sortIndexes = items.map((i) => i.sortIndex)
    expect(sortIndexes).toEqual([...sortIndexes].sort((a, b) => a - b))
    expect(items.find((i) => i.id === thirdId)!.sortIndex).toBe(2)
  })

  it('clamps updated quantity to a minimum of 1', () => {
    start()
    const store = useBillStore.getState()
    const itemId = store.addItem({ name: 'Pizza', unitPriceMinorUnits: 5000 })
    store.updateItem(itemId, { quantity: 0 })
    expect(useBillStore.getState().bill!.items[0]!.quantity).toBe(1)
  })

  it('removes an item', () => {
    start()
    const store = useBillStore.getState()
    const itemId = store.addItem({ name: 'Pizza', unitPriceMinorUnits: 5000 })
    store.removeItem(itemId)
    expect(useBillStore.getState().bill!.items).toEqual([])
  })
})

describe('setItemDiners', () => {
  it('throws when given an empty array', () => {
    start()
    const store = useBillStore.getState()
    const itemId = store.addItem({ name: 'Pizza', unitPriceMinorUnits: 5000 })
    expect(() => store.setItemDiners(itemId, [])).toThrow()
  })

  it('updates the assigned diners otherwise', () => {
    start()
    const store = useBillStore.getState()
    const d1 = store.addDiner()
    store.addDiner()
    const itemId = store.addItem({ name: 'Pizza', unitPriceMinorUnits: 5000 })
    store.setItemDiners(itemId, [d1])
    expect(useBillStore.getState().bill!.items[0]!.sharedBy).toEqual([d1])
  })
})

describe('removeDiner', () => {
  it('throws when removing the only diner on the bill, even with no items', () => {
    start()
    const store = useBillStore.getState()
    const onlyDiner = store.addDiner()
    expect(() => store.removeDiner(onlyDiner)).toThrow()
    expect(useBillStore.getState().bill!.diners).toHaveLength(1)
  })

  it('throws when removing the only diner even if reassignments are (uselessly) provided', () => {
    start()
    const store = useBillStore.getState()
    const onlyDiner = store.addDiner()
    const itemId = store.addItem({ name: 'Espresso', unitPriceMinorUnits: 1000 })
    expect(() => store.removeDiner(onlyDiner, { [itemId]: [onlyDiner] })).toThrow()
  })

  it('throws if an orphaned item has no reassignment', () => {
    start()
    const store = useBillStore.getState()
    const d1 = store.addDiner()
    store.addItem({ name: 'Espresso', unitPriceMinorUnits: 1000 }) // shared by d1 only
    expect(() => store.removeDiner(d1)).toThrow()
    // Nothing changed — the diner and item are both still there.
    expect(useBillStore.getState().bill!.diners).toHaveLength(1)
  })

  it('removes the diner from shared items without needing a reassignment', () => {
    start()
    const store = useBillStore.getState()
    const d1 = store.addDiner()
    const d2 = store.addDiner()
    store.addItem({ name: 'Pizza', unitPriceMinorUnits: 5000 }) // shared by both

    store.removeDiner(d2)

    const { bill } = useBillStore.getState()
    expect(bill!.diners.map((d) => d.id)).toEqual([d1])
    expect(bill!.items[0]!.sharedBy).toEqual([d1])
  })

  it('applies the provided reassignment to an orphaned item and completes removal', () => {
    start()
    const store = useBillStore.getState()
    const d1 = store.addDiner()
    const d2 = store.addDiner()
    const itemId = store.addItem({ name: 'Espresso', unitPriceMinorUnits: 1000 })
    store.setItemDiners(itemId, [d1]) // now solely assigned to d1

    store.removeDiner(d1, { [itemId]: [d2] })

    const { bill } = useBillStore.getState()
    expect(bill!.diners.map((d) => d.id)).toEqual([d2])
    expect(bill!.items[0]!.sharedBy).toEqual([d2])
  })

  it('closes the gap in default diner labels after removal, matching the product example', () => {
    start()
    const store = useBillStore.getState()
    const d1 = store.addDiner()
    const d2 = store.addDiner()
    const d3 = store.addDiner()

    expect(getDinerDefaultPositions(useBillStore.getState().bill!.diners)).toEqual({
      [d1]: 1,
      [d2]: 2,
      [d3]: 3,
    })

    store.removeDiner(d2)

    expect(getDinerDefaultPositions(useBillStore.getState().bill!.diners)).toEqual({
      [d1]: 1,
      [d3]: 2,
    })
  })
})

describe('setTip / setRoundUpPayments / setRestaurantName', () => {
  it('sets the tip config', () => {
    start()
    const store = useBillStore.getState()
    store.setTip({ mode: 'percentage', valueBasisPoints: 1250 })
    expect(useBillStore.getState().bill!.tip).toEqual({ mode: 'percentage', valueBasisPoints: 1250 })
  })

  it('toggles round-up payments', () => {
    start()
    const store = useBillStore.getState()
    store.setRoundUpPayments(true)
    expect(useBillStore.getState().bill!.roundUpPayments).toBe(true)
  })

  it('sets and clears the restaurant name', () => {
    start()
    const store = useBillStore.getState()
    store.setRestaurantName('Cafe Levinsky')
    expect(useBillStore.getState().bill!.restaurantName).toBe('Cafe Levinsky')
    store.setRestaurantName('   ')
    expect(useBillStore.getState().bill!.restaurantName).toBeUndefined()
  })
})

describe('discardBill', () => {
  it('discards the active bill', () => {
    start()
    useBillStore.getState().discardBill()
    expect(useBillStore.getState().bill).toBeNull()
  })
})
