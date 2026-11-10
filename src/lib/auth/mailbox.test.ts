import { describe, expect, it } from 'vitest'
import { canonicalMailbox } from './mailbox'

describe('canonicalMailbox', () => {
  it.each([
    ['tomer@gmail.com', 'tomer@gmail.com'],
    ['tomer+test2@gmail.com', 'tomer@gmail.com'],
    ['To.Mer+a+b@Gmail.com', 'tomer@gmail.com'],
    ['t.o.m.e.r@googlemail.com', 'tomer@gmail.com'],
    ['dana+bills@outlook.com', 'dana@outlook.com'],
    ['first.last@company.co.il', 'first.last@company.co.il'],
    ['  Dana@Example.com ', 'dana@example.com'],
  ])('%s → %s', (input, expected) => {
    expect(canonicalMailbox(input)).toBe(expected)
  })
})
