jest.mock('../order-category.model', () => ({ __esModule: true, default: {} }));
jest.mock('../order-visit.model', () => ({ __esModule: true, default: {} }));
jest.mock('../catalog-item.model', () => ({ __esModule: true, default: {} }));
jest.mock('../guest-order.model', () => ({ __esModule: true, default: {} }));
jest.mock('../reservation-code.model', () => ({ __esModule: true, default: {} }));
jest.mock('../order-promotion.model', () => ({ __esModule: true, default: {} }));
jest.mock('../discount-code.model', () => ({ __esModule: true, default: {} }));
jest.mock('../ical-source.model', () => ({ __esModule: true, default: {} }));
jest.mock('../ical-sync.service', () => ({ syncICalSource: jest.fn() }));
jest.mock('../../booking/booking.model', () => ({ __esModule: true, default: {} }));
jest.mock('../../dispatch', () => ({ dispatchService: {} }));
jest.mock('../../scheduler/escalation', () => ({ cancelEscalation: jest.fn(), scheduleEscalation: jest.fn() }));
jest.mock('../sse.service', () => ({ sendSSEEvent: jest.fn(), sendSSEEventToAll: jest.fn() }));
jest.mock('../../../config/config', () => ({ __esModule: true, default: { jwt: { secret: 'test' }, urls: { app: 'http://localhost' }, env: 'test' } }));
jest.mock('../../room', () => ({ Room: {} }));
jest.mock('../../hotel', () => ({ Hotel: {} }));
jest.mock('../../activity', () => ({ Activity: {} }));
jest.mock('../../email/email.service', () => ({}));
jest.mock('../../nps/nps.service', () => ({ scheduleNpsEmail: jest.fn() }));

import CatalogItem from '../catalog-item.model';
import DiscountCode from '../discount-code.model';
import { calculateDiscount, validateDiscount } from '../orders.service';

describe('calculateDiscount', () => {
  it('applies percentage discount to full cart', () => {
    const result = calculateDiscount({
      discountType: 'percentage',
      discountValue: 10,
      applicableCategories: [],
      orderTotal: 100,
      items: [{ categoryId: 'cat1', subtotal: 100 }],
    });
    expect(result.discountAmount).toBe(10);
    expect(result.newTotal).toBe(90);
  });

  it('applies fixed discount', () => {
    const result = calculateDiscount({
      discountType: 'fixed',
      discountValue: 5,
      applicableCategories: [],
      orderTotal: 30,
      items: [{ categoryId: 'cat1', subtotal: 30 }],
    });
    expect(result.discountAmount).toBe(5);
    expect(result.newTotal).toBe(25);
  });

  it('applies percentage only to matching categories', () => {
    const result = calculateDiscount({
      discountType: 'percentage',
      discountValue: 20,
      applicableCategories: ['cat2'],
      orderTotal: 50,
      items: [
        { categoryId: 'cat1', subtotal: 30 },
        { categoryId: 'cat2', subtotal: 20 },
      ],
    });
    expect(result.discountAmount).toBe(4); // 20% of 20
    expect(result.newTotal).toBe(46);
  });

  it('does not allow discount to exceed order total', () => {
    const result = calculateDiscount({
      discountType: 'fixed',
      discountValue: 999,
      applicableCategories: [],
      orderTotal: 10,
      items: [{ categoryId: 'cat1', subtotal: 10 }],
    });
    expect(result.discountAmount).toBe(10);
    expect(result.newTotal).toBe(0);
  });
});

describe('validateDiscount', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('recalculates discount previews from server catalog pricing', async () => {
    (DiscountCode as any).findOne = jest.fn().mockResolvedValue({
      isActive: true,
      validFrom: null,
      validTo: null,
      maxUses: null,
      usedCount: 0,
      minOrderAmount: null,
      applicableCategories: [],
      discountType: 'percentage',
      discountValue: 10,
    });
    (CatalogItem as any).find = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          _id: 'item-1',
          categoryId: 'cat-1',
          price: 50,
          discount: 20,
        },
      ]),
    });

    const result = await validateDiscount({
      hotelId: 'hotel-1',
      code: 'SAVE10',
      totalAmount: 1,
      items: [{ itemId: 'item-1', qty: 2, price: 1 }],
    });

    expect(result).toMatchObject({
      valid: true,
      discountAmount: 8,
      newTotal: 72,
    });
  });
});
