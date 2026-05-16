export interface OrderItem {
  price: number
  discount?: number
}

/** Returns discounted unit price for a catalog item. */
export const discountedPrice = (item: OrderItem): number =>
  item.discount && item.discount > 0
    ? parseFloat((item.price * (1 - item.discount / 100)).toFixed(2))
    : item.price

/** Returns a human-readable label for a payment method. */
export const getPaymentLabel = (payment?: string): string => {
  switch (payment) {
    case 'cash': return 'Cash on arrival'
    case 'card': return 'Card on terminal'
    case 'room': return 'Pay at hotel / room charge'
    case 'online': return 'Paid online'
    default: return 'Payment at hotel'
  }
}

/** Returns true if the string looks like an absolute image URL or data URL. */
export const isImgUrl = (s?: string): boolean =>
  Boolean(s && (s.startsWith('http') || s.startsWith('data:')))

/** Converts a Date to the value format required by <input type="datetime-local">. */
export const toDateTimeLocalValue = (date: Date): string => {
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}
