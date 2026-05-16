# Wave 2 — Discount Codes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hotel-managed discount codes with percentage/fixed/category discounts, expiry dates, and usage limits; guest can enter a code at checkout for a live price preview before placing the order.

**Architecture:** New `DiscountCode` MongoDB collection. Backend exposes CRUD endpoints (hotel-auth) and a public `/validate-discount` endpoint used by the guest app for real-time preview. On order placement the code is revalidated server-side and `usedCount` is incremented atomically. Dashboard gets a new "Discount Codes" tab (7th tab in Orders). Guest app order summary gets a discount code input row above the totals.

**Tech Stack:** Mongoose, Express, MUI v5, RTK Query, Next.js fetch (guest app)

---

## File Map

**Backend — create:**
- `src/modules/orders/discount-code.model.ts` — DiscountCode schema

**Backend — modify:**
- `src/modules/orders/orders.interfaces.ts` — add IDiscountCode, update IGuestOrder + IPlaceOrderBody
- `src/modules/orders/guest-order.model.ts` — add discountCode, discountAmount, originalTotal fields
- `src/modules/orders/orders.service.ts` — add discount CRUD + validateDiscount + placeOrder integration
- `src/modules/orders/orders.controller.ts` — add discount handlers
- `src/routes/v1/orders.route.ts` — add discount routes

**Dashboard — create:**
- `src/views/orders/components/DiscountCodes.tsx` — full tab component

**Dashboard — modify:**
- `src/types/index.ts` — add IDiscountCode, update IGuestOrder
- `src/redux/api/ordersApi.ts` — add discount endpoints
- `src/app/[lang]/(private)/orders/page.tsx` — add 7th tab

**Guest app — modify:**
- `src/views/orders/GuestOrderPage.tsx` — discount code input + preview in order summary

---

## Task 1: Add IDiscountCode interface and update order interfaces

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.interfaces.ts`

- [ ] **Step 1: Add IDiscountCode interface**

In `orders.interfaces.ts`, add after the `IReservationCode` block:

```typescript
// ─── Discount Code ────────────────────────────────────────────────────────────

export type DiscountType = 'percentage' | 'fixed';

export interface IDiscountCode {
  hotelId: Types.ObjectId;
  code: string;           // uppercase, unique per hotel
  description?: string;
  discountType: DiscountType;
  discountValue: number;  // 10 = 10% or 10 = 10€
  applicableCategories: Types.ObjectId[]; // empty = all categories
  validFrom?: Date;
  validTo?: Date;
  maxUses?: number;
  usedCount: number;
  minOrderAmount?: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
}

export interface IDiscountCodeDoc extends IDiscountCode, Document {}
export interface IDiscountCodeModel extends Model<IDiscountCodeDoc> {}

export type NewDiscountCode = Omit<IDiscountCode, 'usedCount' | 'isActive'>;
export type UpdateDiscountCode = Partial<Omit<IDiscountCode, 'hotelId' | 'usedCount'>>;
```

- [ ] **Step 2: Update IGuestOrder with discount fields**

In the `IGuestOrder` interface, add after `reservationCodeId`:

```typescript
discountCode?: string;
discountAmount?: number;
originalTotal?: number;
```

- [ ] **Step 3: Update IPlaceOrderBody with discountCode**

In `IPlaceOrderBody`, add:

```typescript
discountCode?: string;
```

- [ ] **Step 4: Compile**

```bash
cd infiora-backend-main/infiora-backend-main && yarn compile
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/orders/orders.interfaces.ts
git commit -m "feat(discount): add IDiscountCode interface, update IGuestOrder with discount fields"
```

---

## Task 2: Create DiscountCode Mongoose model

**Files:**
- Create: `infiora-backend-main/infiora-backend-main/src/modules/orders/discount-code.model.ts`

- [ ] **Step 1: Write the model**

```typescript
// src/modules/orders/discount-code.model.ts
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { IDiscountCodeDoc, IDiscountCodeModel } from './orders.interfaces';

const discountCodeSchema = new mongoose.Schema<IDiscountCodeDoc, IDiscountCodeModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    code: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderCategory' }],
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  { timestamps: true }
);

discountCodeSchema.pre('save', function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase().replace(/\s/g, '');
  }
  next();
});

// Unique code per hotel
discountCodeSchema.index({ hotelId: 1, code: 1 }, { unique: true });
discountCodeSchema.index({ hotelId: 1, isActive: 1 });

discountCodeSchema.plugin(toJSON);

const DiscountCode = mongoose.model<IDiscountCodeDoc, IDiscountCodeModel>('DiscountCode', discountCodeSchema);
export default DiscountCode;
```

- [ ] **Step 2: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/orders/discount-code.model.ts
git commit -m "feat(discount): add DiscountCode mongoose model"
```

---

## Task 3: Update GuestOrder model with discount fields

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/guest-order.model.ts`

- [ ] **Step 1: Add discount fields to guest-order schema**

Find the `guestOrderSchema` definition and add these fields (after the `reservationCodeId` field):

```typescript
discountCode: { type: String, default: null },
discountAmount: { type: Number, default: null },
originalTotal: { type: Number, default: null },
```

- [ ] **Step 2: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/orders/guest-order.model.ts
git commit -m "feat(discount): add discountCode, discountAmount, originalTotal to GuestOrder"
```

---

## Task 4: Add discount service functions

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.service.ts`

- [ ] **Step 1: Write unit tests for discount validation**

Create `src/modules/orders/__tests__/discount.service.test.ts`:

```typescript
import { calculateDiscount } from '../orders.service';

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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
yarn test --testPathPattern=discount.service
```

Expected: FAIL — `calculateDiscount` is not defined.

- [ ] **Step 3: Add imports in orders.service.ts**

At the top of orders.service.ts, add:

```typescript
import DiscountCode from './discount-code.model';
import { IDiscountCode, NewDiscountCode, UpdateDiscountCode, DiscountType } from './orders.interfaces';
```

- [ ] **Step 4: Add calculateDiscount helper and discount service functions**

Add at the end of orders.service.ts:

```typescript
// ─── Discount Codes ───────────────────────────────────────────────────────────

export const calculateDiscount = (params: {
  discountType: DiscountType;
  discountValue: number;
  applicableCategories: string[];
  orderTotal: number;
  items: { categoryId: string; subtotal: number }[];
}): { discountAmount: number; newTotal: number } => {
  const { discountType, discountValue, applicableCategories, orderTotal, items } = params;

  let base = orderTotal;
  if (applicableCategories.length > 0) {
    base = items
      .filter(i => applicableCategories.includes(i.categoryId))
      .reduce((sum, i) => sum + i.subtotal, 0);
  }

  const raw = discountType === 'percentage' ? base * (discountValue / 100) : discountValue;
  const discountAmount = parseFloat(Math.min(raw, orderTotal).toFixed(2));
  const newTotal = parseFloat((orderTotal - discountAmount).toFixed(2));
  return { discountAmount, newTotal };
};

export const getDiscountCodes = async (hotelId: string) => {
  return DiscountCode.find({ hotelId }).sort({ createdAt: -1 });
};

export const createDiscountCode = async (hotelId: string, userId: string, data: NewDiscountCode) => {
  return DiscountCode.create({ ...data, hotelId, createdBy: userId, usedCount: 0, isActive: true });
};

export const updateDiscountCode = async (codeId: string, hotelId: string, data: UpdateDiscountCode) => {
  const dc = await DiscountCode.findOne({ _id: codeId, hotelId });
  if (!dc) throw new ApiError(httpStatus.NOT_FOUND, 'Discount code not found');
  Object.assign(dc, data);
  await dc.save();
  return dc;
};

export const deleteDiscountCode = async (codeId: string, hotelId: string) => {
  const deleted = await DiscountCode.findOneAndDelete({ _id: codeId, hotelId });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Discount code not found');
};

export const validateDiscount = async (params: {
  hotelId: string;
  code: string;
  items: { itemId: string; qty: number; categoryId?: string; price: number }[];
  totalAmount: number;
}): Promise<{ valid: boolean; reason?: string; discountType?: DiscountType; discountValue?: number; discountAmount?: number; newTotal?: number }> => {
  const { hotelId, code, items, totalAmount } = params;
  const dc = await DiscountCode.findOne({ hotelId, code: code.trim().toUpperCase() });

  if (!dc) return { valid: false, reason: 'Code not found' };
  if (!dc.isActive) return { valid: false, reason: 'Code is inactive' };

  const now = new Date();
  if (dc.validFrom && now < dc.validFrom) return { valid: false, reason: 'Code is not yet valid' };
  if (dc.validTo && now > dc.validTo) return { valid: false, reason: 'Code has expired' };
  if (dc.maxUses != null && dc.usedCount >= dc.maxUses) return { valid: false, reason: 'Code usage limit reached' };
  if (dc.minOrderAmount != null && totalAmount < dc.minOrderAmount) {
    return { valid: false, reason: `Minimum order amount is ${dc.minOrderAmount}` };
  }

  const itemsWithCategory = items.map(i => ({
    categoryId: i.categoryId || '',
    subtotal: i.price * i.qty,
  }));
  const categoryIds = dc.applicableCategories.map(String);
  const { discountAmount, newTotal } = calculateDiscount({
    discountType: dc.discountType,
    discountValue: dc.discountValue,
    applicableCategories: categoryIds,
    orderTotal: totalAmount,
    items: itemsWithCategory,
  });

  return { valid: true, discountType: dc.discountType, discountValue: dc.discountValue, discountAmount, newTotal };
};
```

- [ ] **Step 5: Update placeOrder to handle discountCode**

In the `placeOrder` function in orders.service.ts, find where `total` is calculated and add discount application. After the total is computed and before `GuestOrder.create(...)`, add:

```typescript
let discountAmount: number | undefined;
let originalTotal: number | undefined;
let appliedDiscountCode: string | undefined;

if (body.discountCode) {
  const itemsForDiscount = items.map(i => ({
    itemId: String(i.itemId),
    qty: i.qty,
    categoryId: String((catalogItemMap.get(String(i.itemId)) as any)?.categoryId || ''),
    price: i.price,
  }));
  const validation = await validateDiscount({
    hotelId: String(room.hotelId),
    code: body.discountCode,
    items: itemsForDiscount,
    totalAmount: total,
  });
  if (validation.valid && validation.discountAmount != null) {
    originalTotal = total;
    discountAmount = validation.discountAmount;
    total = validation.newTotal!;
    appliedDiscountCode = body.discountCode.trim().toUpperCase();
    // Increment usedCount atomically
    await DiscountCode.findOneAndUpdate(
      { hotelId: room.hotelId, code: appliedDiscountCode, $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
      { $inc: { usedCount: 1 } }
    );
  }
}
```

Then in `GuestOrder.create({...})`, add the discount fields:

```typescript
...(appliedDiscountCode ? { discountCode: appliedDiscountCode, discountAmount, originalTotal } : {}),
```

Note: `catalogItemMap` — you need to build this from the fetched catalog items to get `categoryId` per item. Find where catalog items are fetched in `placeOrder` and build the map: `const catalogItemMap = new Map(catalogItems.map(i => [String(i._id), i]));`

- [ ] **Step 6: Run discount tests**

```bash
yarn test --testPathPattern=discount.service
```

Expected: PASS (4 tests).

- [ ] **Step 7: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/orders/orders.service.ts src/modules/orders/__tests__/discount.service.test.ts
git commit -m "feat(discount): add discount CRUD, validateDiscount, and placeOrder integration"
```

---

## Task 5: Add discount controllers and routes

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/orders/orders.controller.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/routes/v1/orders.route.ts`

- [ ] **Step 1: Add discount controllers to orders.controller.ts**

```typescript
// ─── Discount Codes ───────────────────────────────────────────────────────────

export const getDiscountCodes = catchAsync(async (req: Request, res: Response) => {
  const codes = await ordersService.getDiscountCodes(req.params['hotelId'] as string);
  res.send(codes);
});

export const createDiscountCode = catchAsync(async (req: Request, res: Response) => {
  const code = await ordersService.createDiscountCode(
    req.params['hotelId'] as string,
    String((req as any).user.id),
    req.body
  );
  res.status(httpStatus.CREATED).send(code);
});

export const updateDiscountCode = catchAsync(async (req: Request, res: Response) => {
  const code = await ordersService.updateDiscountCode(
    req.params['codeId'] as string,
    req.params['hotelId'] as string,
    req.body
  );
  res.send(code);
});

export const deleteDiscountCode = catchAsync(async (req: Request, res: Response) => {
  await ordersService.deleteDiscountCode(req.params['codeId'] as string, req.params['hotelId'] as string);
  res.status(httpStatus.NO_CONTENT).send();
});

export const validateDiscount = catchAsync(async (req: Request, res: Response) => {
  const { hotelId, code, items, totalAmount } = req.body;
  const result = await ordersService.validateDiscount({ hotelId, code, items, totalAmount });
  res.send(result);
});
```

- [ ] **Step 2: Add discount routes to orders.route.ts**

After the Promotions section, add:

```typescript
// ─── Discount Codes ───────────────────────────────────────────────────────────

// Public — validate a discount code before order placement
router.route('/validate-discount').post(guestOrderLimiter, ordersController.validateDiscount);

// Hotel-authenticated CRUD
router
  .route('/hotels/:hotelId/discount-codes')
  .get(auth(), isHotelOwner, ordersController.getDiscountCodes)
  .post(auth(), isHotelOwner, ordersController.createDiscountCode);

router
  .route('/hotels/:hotelId/discount-codes/:codeId')
  .patch(auth(), isHotelOwner, ordersController.updateDiscountCode)
  .delete(auth(), isHotelOwner, ordersController.deleteDiscountCode);
```

- [ ] **Step 3: Compile**

```bash
yarn compile
```

Expected: no errors.

- [ ] **Step 4: Smoke test**

```bash
# Test validate-discount (public route)
curl -X POST http://localhost:3000/v1/orders/validate-discount \
  -H "Content-Type: application/json" \
  -d '{"hotelId":"<id>","code":"DOESNOTEXIST","items":[],"totalAmount":50}'
```

Expected: `{ "valid": false, "reason": "Code not found" }`

- [ ] **Step 5: Commit**

```bash
git add src/modules/orders/orders.controller.ts src/routes/v1/orders.route.ts
git commit -m "feat(discount): add discount controllers and routes"
```

---

## Task 6: Dashboard — types and RTK Query

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/types/index.ts`
- Modify: `infiora-dash-main/infiora-dash-main/src/redux/api/ordersApi.ts`

- [ ] **Step 1: Add IDiscountCode type and update IGuestOrder**

In `src/types/index.ts`, add:

```typescript
export type DiscountType = 'percentage' | 'fixed'

export interface IDiscountCode {
  id: string
  hotelId: string
  code: string
  description?: string
  discountType: DiscountType
  discountValue: number
  applicableCategories: string[]
  validFrom?: string
  validTo?: string
  maxUses?: number
  usedCount: number
  minOrderAmount?: number
  isActive: boolean
  createdAt: string
}
```

In the existing `IGuestOrder` interface, add after `reservationCodeId`:

```typescript
discountCode?: string
discountAmount?: number
originalTotal?: number
```

- [ ] **Step 2: Add discount RTK Query endpoints**

In `ordersApi.ts`, add `'DiscountCodes'` to `tagTypes`:

```typescript
tagTypes: ['Orders', 'Categories', 'Items', 'Settings', 'Codes', 'ICalSources', 'DiscountCodes'],
```

Add endpoints:

```typescript
// Discount codes
getDiscountCodes: builder.query<IDiscountCode[], string>({
  query: hotelId => ({ url: `/v1/orders/hotels/${hotelId}/discount-codes` }),
  providesTags: [{ type: 'DiscountCodes', id: 'LIST' }],
}),
createDiscountCode: builder.mutation<IDiscountCode, { hotelId: string } & Omit<IDiscountCode, 'id' | 'hotelId' | 'usedCount' | 'createdAt'>>({
  query: ({ hotelId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/discount-codes`, method: 'POST', body }),
  invalidatesTags: [{ type: 'DiscountCodes', id: 'LIST' }],
}),
updateDiscountCode: builder.mutation<IDiscountCode, { hotelId: string; codeId: string } & Partial<IDiscountCode>>({
  query: ({ hotelId, codeId, ...body }) => ({ url: `/v1/orders/hotels/${hotelId}/discount-codes/${codeId}`, method: 'PATCH', body }),
  invalidatesTags: [{ type: 'DiscountCodes', id: 'LIST' }],
}),
deleteDiscountCode: builder.mutation<void, { hotelId: string; codeId: string }>({
  query: ({ hotelId, codeId }) => ({ url: `/v1/orders/hotels/${hotelId}/discount-codes/${codeId}`, method: 'DELETE' }),
  invalidatesTags: [{ type: 'DiscountCodes', id: 'LIST' }],
}),
```

Export new hooks from `ordersApi`.

- [ ] **Step 3: Compile**

```bash
cd infiora-dash-main/infiora-dash-main && yarn build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/redux/api/ordersApi.ts
git commit -m "feat(discount): add IDiscountCode types and RTK Query endpoints"
```

---

## Task 7: Dashboard — create DiscountCodes tab component

**Files:**
- Create: `infiora-dash-main/infiora-dash-main/src/views/orders/components/DiscountCodes.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'
import { useState } from 'react'
import {
  Box, Stack, Typography, Button, Card, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Table, TableHead, TableRow,
  TableCell, TableBody, Tooltip
} from '@mui/material'
import { toast } from 'react-toastify'
import { format, isAfter, isBefore, parseISO } from 'date-fns'
import {
  useGetDiscountCodesQuery,
  useCreateDiscountCodeMutation,
  useUpdateDiscountCodeMutation,
  useDeleteDiscountCodeMutation,
  useGetCategoriesQuery,
} from '@/redux/api/ordersApi'
import type { IDiscountCode, DiscountType } from '@/types'

const getCodeStatus = (code: IDiscountCode): { label: string; color: 'success' | 'error' | 'warning' | 'default' } => {
  if (!code.isActive) return { label: 'Inactive', color: 'default' }
  const now = new Date()
  if (code.validTo && isBefore(parseISO(code.validTo), now)) return { label: 'Expired', color: 'error' }
  if (code.maxUses != null && code.usedCount >= code.maxUses) return { label: 'Used up', color: 'warning' }
  if (code.validFrom && isAfter(parseISO(code.validFrom), now)) return { label: 'Scheduled', color: 'default' }
  return { label: 'Active', color: 'success' }
}

const EMPTY_FORM = {
  code: '', description: '', discountType: 'percentage' as DiscountType,
  discountValue: 10, applicableCategories: [] as string[],
  validFrom: '', validTo: '', maxUses: '', minOrderAmount: '', isActive: true,
}

interface CodeDialogProps {
  open: boolean; onClose: () => void; hotelId: string; editing?: IDiscountCode | null
}

function CodeDialog({ open, onClose, hotelId, editing }: CodeDialogProps) {
  const [form, setForm] = useState(() => editing ? {
    code: editing.code, description: editing.description || '',
    discountType: editing.discountType, discountValue: editing.discountValue,
    applicableCategories: editing.applicableCategories,
    validFrom: editing.validFrom ? editing.validFrom.split('T')[0] : '',
    validTo: editing.validTo ? editing.validTo.split('T')[0] : '',
    maxUses: editing.maxUses != null ? String(editing.maxUses) : '',
    minOrderAmount: editing.minOrderAmount != null ? String(editing.minOrderAmount) : '',
    isActive: editing.isActive,
  } : { ...EMPTY_FORM })

  const { data: categories = [] } = useGetCategoriesQuery(hotelId)
  const [create, { isLoading: creating }] = useCreateDiscountCodeMutation()
  const [update, { isLoading: updating }] = useUpdateDiscountCodeMutation()
  const loading = creating || updating

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.code.trim()) { toast.error('Code is required'); return }
    if (!form.discountValue || Number(form.discountValue) <= 0) { toast.error('Discount value must be > 0'); return }
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      applicableCategories: form.applicableCategories,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      isActive: form.isActive,
    }
    try {
      if (editing) {
        await update({ hotelId, codeId: editing.id, ...payload }).unwrap()
        toast.success('Discount code updated')
      } else {
        await create({ hotelId, ...payload } as any).unwrap()
        toast.success('Discount code created')
      }
      onClose()
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{editing ? 'Edit Discount Code' : 'Create Discount Code'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label='Code' value={form.code} fullWidth
            onChange={e => set('code', e.target.value.toUpperCase())}
            disabled={!!editing}
            helperText='Guests will enter this code at checkout'
          />
          <TextField label='Description (internal)' value={form.description} fullWidth onChange={e => set('description', e.target.value)} />
          <Stack direction='row' spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Discount type</InputLabel>
              <Select value={form.discountType} label='Discount type' onChange={e => set('discountType', e.target.value)}>
                <MenuItem value='percentage'>Percentage (%)</MenuItem>
                <MenuItem value='fixed'>Fixed amount</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={form.discountType === 'percentage' ? 'Value (%)' : 'Value (amount)'}
              type='number' value={form.discountValue} fullWidth
              onChange={e => set('discountValue', e.target.value)}
            />
          </Stack>
          <FormControl fullWidth>
            <InputLabel>Applies to categories</InputLabel>
            <Select
              multiple value={form.applicableCategories} label='Applies to categories'
              onChange={e => set('applicableCategories', e.target.value)}
              renderValue={selected => (selected as string[]).map(id => categories.find(c => c.id === id)?.name).join(', ') || 'All categories'}
            >
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Stack direction='row' spacing={2}>
            <TextField label='Valid from' type='date' value={form.validFrom} fullWidth onChange={e => set('validFrom', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label='Valid to' type='date' value={form.validTo} fullWidth onChange={e => set('validTo', e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
          <Stack direction='row' spacing={2}>
            <TextField label='Max uses (blank = unlimited)' type='number' value={form.maxUses} fullWidth onChange={e => set('maxUses', e.target.value)} />
            <TextField label='Min order amount (optional)' type='number' value={form.minOrderAmount} fullWidth onChange={e => set('minOrderAmount', e.target.value)} />
          </Stack>
          <FormControlLabel control={<Switch checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />} label='Active' />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant='contained' onClick={handleSubmit} disabled={loading}>
          {editing ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface Props { hotelId: string }

export default function DiscountCodes({ hotelId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<IDiscountCode | null>(null)
  const { data: codes = [], isLoading } = useGetDiscountCodesQuery(hotelId)
  const [deleteCode] = useDeleteDiscountCodeMutation()

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (code: IDiscountCode) => { setEditing(code); setDialogOpen(true) }
  const handleDelete = async (codeId: string) => {
    if (!confirm('Delete this discount code?')) return
    try {
      await deleteCode({ hotelId, codeId }).unwrap()
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (isLoading) return null

  return (
    <Box>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h6'>Discount Codes</Typography>
        <Button variant='contained' onClick={openCreate}>Create code</Button>
      </Stack>

      {codes.length === 0 ? (
        <Typography color='text.secondary'>No discount codes yet. Create one to allow guests to apply discounts at checkout.</Typography>
      ) : (
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Applies to</TableCell>
              <TableCell>Valid</TableCell>
              <TableCell>Uses</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {codes.map(code => {
              const status = getCodeStatus(code)
              return (
                <TableRow key={code.id} hover>
                  <TableCell><Typography fontWeight={600}>{code.code}</Typography></TableCell>
                  <TableCell>
                    {code.discountType === 'percentage' ? `${code.discountValue}%` : `${code.discountValue} (fixed)`}
                  </TableCell>
                  <TableCell>{code.applicableCategories.length === 0 ? 'All categories' : `${code.applicableCategories.length} categories`}</TableCell>
                  <TableCell>
                    {code.validFrom || code.validTo
                      ? `${code.validFrom ? format(parseISO(code.validFrom), 'dd.MM.yy') : '∞'} → ${code.validTo ? format(parseISO(code.validTo), 'dd.MM.yy') : '∞'}`
                      : 'Always'}
                  </TableCell>
                  <TableCell>{code.usedCount}{code.maxUses != null ? ` / ${code.maxUses}` : ''}</TableCell>
                  <TableCell><Chip size='small' label={status.label} color={status.color} /></TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={0.5}>
                      <IconButton size='small' onClick={() => openEdit(code)}>✏</IconButton>
                      <IconButton size='small' color='error' onClick={() => handleDelete(code.id)}>✕</IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <CodeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} hotelId={hotelId} editing={editing} />
    </Box>
  )
}
```

- [ ] **Step 2: Compile**

```bash
yarn build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/orders/components/DiscountCodes.tsx
git commit -m "feat(discount): create DiscountCodes dashboard tab component"
```

---

## Task 8: Add Discount Codes tab to Orders page

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/app/[lang]/(private)/orders/page.tsx`

- [ ] **Step 1: Import DiscountCodes component**

```tsx
import DiscountCodes from '@/views/orders/components/DiscountCodes'
```

- [ ] **Step 2: Add tab item**

Find the tab items array (where Dashboard, Orders, Menu, Scheduled, Setup, Codes are defined). Add:

```tsx
{ value: 'discount-codes', label: 'Discount Codes' }
```

- [ ] **Step 3: Add tab panel**

Find where the tab panels are rendered (the section that renders `<ReservationCodes />` for the `codes` tab). Add:

```tsx
{activeTab === 'discount-codes' && <DiscountCodes hotelId={hotelId} />}
```

- [ ] **Step 4: Start dev server and verify**

```bash
yarn dev
```

Navigate to Orders. Verify a 7th "Discount Codes" tab appears. Click it and verify the empty state and "Create code" button are visible.

- [ ] **Step 5: Commit**

```bash
git add src/app/[lang]/(private)/orders/page.tsx
git commit -m "feat(discount): add Discount Codes tab to Orders page"
```

---

## Task 9: Guest app — discount code input

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/views/orders/GuestOrderPage.tsx`

- [ ] **Step 1: Add discount state variables**

Inside `GuestOrderPage`, add these state variables:

```typescript
const [discountCode, setDiscountCode] = useState('')
const [discountApplied, setDiscountApplied] = useState<{
  code: string
  discountType: string
  discountValue: number
  discountAmount: number
  newTotal: number
} | null>(null)
const [discountLoading, setDiscountLoading] = useState(false)
const [discountError, setDiscountError] = useState('')
```

- [ ] **Step 2: Add applyDiscount function**

Add this function inside the component (uses the existing `settings` and `cartItems` state):

```typescript
const applyDiscount = async () => {
  if (!discountCode.trim()) return
  setDiscountLoading(true)
  setDiscountError('')
  try {
    const items = cartItems.map(ci => ({
      itemId: ci.item.id,
      qty: ci.qty,
      categoryId: ci.item.categoryId,
      price: dp(ci.item),
    }))
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const res = await fetch(`${API}/v1/orders/validate-discount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelId: roomData?.hotelId, code: discountCode.trim(), items, totalAmount: total }),
    })
    const data = await res.json()
    if (data.valid) {
      setDiscountApplied({ code: discountCode.trim().toUpperCase(), ...data })
      setDiscountError('')
    } else {
      setDiscountError(data.reason || 'Invalid code')
      setDiscountApplied(null)
    }
  } catch {
    setDiscountError('Failed to validate code')
  } finally {
    setDiscountLoading(false)
  }
}

const removeDiscount = () => {
  setDiscountApplied(null)
  setDiscountCode('')
  setDiscountError('')
}
```

- [ ] **Step 3: Pass discountCode in order placement**

Find the `placeOrder` / submit function in `GuestOrderPage`. In the fetch body for placing the order, add:

```typescript
...(discountApplied ? { discountCode: discountApplied.code } : {}),
```

- [ ] **Step 4: Add discount code UI in order summary**

Find where the order total is displayed in the JSX (the checkout/summary section). Add this block above the total line:

```tsx
{/* Discount code input */}
{settings?.paymentMethods && (
  <div style={{ margin: '12px 0' }}>
    {!discountApplied ? (
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type='text'
          value={discountCode}
          onChange={e => setDiscountCode(e.target.value.toUpperCase())}
          placeholder='Discount code'
          style={{
            flex: 1, padding: '8px 12px', border: '1px solid #ddd',
            borderRadius: 8, fontSize: 14, textTransform: 'uppercase'
          }}
        />
        <button
          onClick={applyDiscount}
          disabled={discountLoading || !discountCode.trim()}
          style={{
            padding: '8px 16px', background: '#1976d2', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14
          }}
        >
          {discountLoading ? '...' : 'Apply'}
        </button>
      </div>
    ) : (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#e8f5e9', borderRadius: 8 }}>
        <span style={{ fontSize: 14, color: '#2e7d32' }}>
          ✓ {discountApplied.code} — saving {settings.currencySymbol}{discountApplied.discountAmount.toFixed(2)}
        </span>
        <button onClick={removeDiscount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 16 }}>✕</button>
      </div>
    )}
    {discountError && <p style={{ color: '#d32f2f', fontSize: 12, margin: '4px 0 0' }}>{discountError}</p>}
  </div>
)}

{/* Total — show original + discounted if discount applied */}
```

Then update the total display to show strike-through original when discount is applied:

```tsx
{discountApplied ? (
  <div>
    <span style={{ textDecoration: 'line-through', color: '#999', marginRight: 8 }}>
      {settings.currencySymbol}{discountApplied.newTotal + discountApplied.discountAmount ? (discountApplied.newTotal + discountApplied.discountAmount).toFixed(2) : ''}
    </span>
    <strong>{settings.currencySymbol}{discountApplied.newTotal.toFixed(2)}</strong>
  </div>
) : (
  <strong>{settings.currencySymbol}{cartTotal.toFixed(2)}</strong>
)}
```

Note: Find the existing `cartTotal` calculation variable in the component and adjust as needed.

- [ ] **Step 5: Start dev server and test golden path**

```bash
cd infiora-app-main/infiora-app-main && yarn dev
```

1. Open the guest order page
2. Add items to cart
3. Proceed to checkout/summary
4. Enter an invalid code → verify error message appears
5. Create a real discount code in the dashboard, then enter it → verify green confirmation with savings appears
6. Place the order → verify order in dashboard shows discount amount

- [ ] **Step 6: Commit**

```bash
git add src/views/orders/GuestOrderPage.tsx
git commit -m "feat(discount): add discount code input and price preview to guest order page"
```

---

## Wave 2 Complete

- ✅ DiscountCode model with all fields
- ✅ Server-side validation with atomic usedCount increment
- ✅ Dashboard Discount Codes tab (CRUD)
- ✅ Guest app discount input with live preview
- ✅ Revalidation on order placement
