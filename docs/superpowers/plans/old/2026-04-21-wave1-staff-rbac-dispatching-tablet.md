# Wave 1: Staff RBAC, Smart Dispatching & Tablet Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hotel-scoped staff identity (PIN-based tablet login), role-based permissions, notification-group routing for orders, and a full-screen tablet UI — all gated behind feature flags so existing hotels are unaffected.

**Architecture:** Four new MongoDB collections (StaffRole, StaffMember, NotificationGroup, DispatchRule). Device JWT (90 d, localStorage) proves a tablet is valid; staff session JWT (8 h, React state) proves which staff member is logged in after PIN entry. SSE refactored from a single `hotelId → clients` map to dual maps (`adminClients` for dash, `groupClients` for tablets). Dispatch routing evaluates `DispatchRule[]` sorted by priority on every new order and routes the SSE event to the matching `NotificationGroup`. All features are toggled via `hotel.features.staffRbacEnabled` / `hotel.features.smartDispatchingEnabled`.

**Tech Stack:** Node.js + TypeScript + Express + MongoDB/Mongoose · bcryptjs · jsonwebtoken · node-cron · Next.js 14 App Router (infiora-dash) · Jest + Supertest (tests)

**Spec:** `docs/superpowers/specs/2026-04-21-booking-engine-rbac-dispatching-design.md`

---

## File Map

### New Backend Files

| File | Purpose |
|------|---------|
| `src/modules/staff/staff.interfaces.ts` | TypeScript types for StaffRole + StaffMember |
| `src/modules/staff/staff-role.model.ts` | StaffRole Mongoose schema |
| `src/modules/staff/staff-member.model.ts` | StaffMember Mongoose schema (bcrypt PIN) |
| `src/modules/staff/staff.validation.ts` | Joi schemas: createRole, updateRole, createMember, updateMember, verifyPin |
| `src/modules/staff/staff.service.ts` | CRUD for roles + members, PIN verification |
| `src/modules/staff/staff.controller.ts` | HTTP handlers (thin, delegates to service) |
| `src/modules/staff/index.ts` | Module re-exports |
| `src/modules/dispatch/dispatch.interfaces.ts` | TypeScript types for NotificationGroup + DispatchRule |
| `src/modules/dispatch/notification-group.model.ts` | NotificationGroup Mongoose schema |
| `src/modules/dispatch/dispatch-rule.model.ts` | DispatchRule Mongoose schema |
| `src/modules/dispatch/dispatch.validation.ts` | Joi schemas |
| `src/modules/dispatch/dispatch.service.ts` | CRUD + `route()` logic |
| `src/modules/dispatch/dispatch.controller.ts` | HTTP handlers |
| `src/modules/dispatch/index.ts` | Module re-exports |
| `src/modules/middleware/isDeviceAuth.ts` | Verifies device JWT Bearer token |
| `src/modules/middleware/staffAuth.ts` | Verifies staff-session JWT + permission check |
| `src/modules/scheduler/escalation.ts` | In-memory timer: scheduleEscalation / cancelEscalation |
| `src/modules/scheduler/scheduledOrders.ts` | Cron: surfaces orders 15 min before scheduledFor |
| `src/routes/v1/staff.route.ts` | Staff RBAC endpoints |
| `src/routes/v1/dispatch.route.ts` | NotificationGroup + DispatchRule endpoints |

### Modified Backend Files

| File | Change |
|------|--------|
| `src/modules/hotel/hotel.model.ts` | Add `staffRbacEnabled`, `smartDispatchingEnabled`, `bookableServicesEnabled` to features |
| `src/modules/hotel/hotel.interfaces.ts` | Add new flags to `IHotelFeatures` |
| `src/modules/hotel/hotel.service.ts` | Add `generateDeviceToken()` |
| `src/modules/hotel/hotel.controller.ts` | Add `generateDeviceToken` handler |
| `src/routes/v1/hotel.route.ts` | Add device token endpoint |
| `src/modules/orders/guest-order.model.ts` | Add `staffMemberId`, `dispatchGroupId`, `surfacedAt` |
| `src/modules/orders/orders.interfaces.ts` | Add new fields to `IGuestOrder` |
| `src/modules/orders/sse.service.ts` | Dual-map refactor + new `groupClients` functions |
| `src/modules/orders/orders.service.ts` | Call dispatch routing in `placeOrder`, record `dispatchGroupId` |
| `src/routes/v1/orders.route.ts` | Add tablet order action routes |
| `src/routes/v1/index.ts` | Register staff + dispatch routes |
| `src/index.ts` | Start escalation + scheduledOrders cron jobs |
| `src/modules/middleware/index.ts` | Export new middleware |

### New Dash Files (infiora-dash)

| File | Purpose |
|------|---------|
| `src/app/[lang]/(private)/staff/page.tsx` | Staff members list route |
| `src/app/[lang]/(private)/staff/roles/page.tsx` | Staff roles route |
| `src/app/[lang]/(private)/staff/groups/page.tsx` | Notification groups route |
| `src/app/[lang]/(private)/staff/dispatch/page.tsx` | Dispatch rules route |
| `src/app/[lang]/(tablet)/layout.tsx` | Tablet layout (no sidebar, full-screen) |
| `src/app/[lang]/(tablet)/tablet/[groupId]/page.tsx` | Tablet mode — PIN pad + order cards |
| `src/views/staff/pages/StaffPage.tsx` | StaffMember list + create + edit modal |
| `src/views/staff/pages/StaffRolesPage.tsx` | StaffRole list + create + edit modal |
| `src/views/staff/pages/NotificationGroupsPage.tsx` | NotificationGroup CRUD |
| `src/views/staff/pages/DispatchRulesPage.tsx` | DispatchRule list + drag-to-reorder |
| `src/views/tablet/pages/TabletPage.tsx` | Full-screen tablet: PIN pad overlay + order cards |

---

## Task 1: Hotel Feature Flags + GuestOrder New Fields

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. Stack: Node.js + TypeScript + Express + MongoDB/Mongoose. Module structure: `model.ts → interfaces.ts → validation.ts → service.ts → controller.ts`; routes at `src/routes/v1/`. This task adds three new feature flags to the Hotel model and three new fields to GuestOrder. No new collections created.

**Files:**
- Modify: `src/modules/hotel/hotel.model.ts`
- Modify: `src/modules/hotel/hotel.interfaces.ts`
- Modify: `src/modules/orders/guest-order.model.ts`
- Modify: `src/modules/orders/orders.interfaces.ts`

- [ ] **Step 1: Add feature flags to `src/modules/hotel/hotel.model.ts`**

Find the `features` block (currently lines 120-124):
```typescript
features: {
  ordersEnabled: { type: Boolean, default: true },
  maintenanceEnabled: { type: Boolean, default: true },
  housekeepingEnabled: { type: Boolean, default: true },
},
```
Replace with:
```typescript
features: {
  ordersEnabled: { type: Boolean, default: true },
  maintenanceEnabled: { type: Boolean, default: true },
  housekeepingEnabled: { type: Boolean, default: true },
  staffRbacEnabled: { type: Boolean, default: false },
  smartDispatchingEnabled: { type: Boolean, default: false },
  bookableServicesEnabled: { type: Boolean, default: false },
},
```

- [ ] **Step 2: Update `IHotelFeatures` in `src/modules/hotel/hotel.interfaces.ts`**

Find `IHotelFeatures` (around line 65):
```typescript
export interface IHotelFeatures {
  ordersEnabled?: boolean;
  maintenanceEnabled?: boolean;
  housekeepingEnabled?: boolean;
}
```
Replace with:
```typescript
export interface IHotelFeatures {
  ordersEnabled?: boolean;
  maintenanceEnabled?: boolean;
  housekeepingEnabled?: boolean;
  staffRbacEnabled?: boolean;
  smartDispatchingEnabled?: boolean;
  bookableServicesEnabled?: boolean;
}
```

- [ ] **Step 3: Add fields to `src/modules/orders/guest-order.model.ts`**

Inside `guestOrderSchema`, after the `reservationCodeId` field and before the closing `}` of the schema object, add:
```typescript
staffMemberId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'StaffMember',
  default: null,
},
dispatchGroupId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'NotificationGroup',
  default: null,
},
surfacedAt: {
  type: Date,
  default: null,
},
```

- [ ] **Step 4: Update `IGuestOrder` in `src/modules/orders/orders.interfaces.ts`**

Find `IGuestOrder` interface (currently ends with `reservationCodeId?: Types.ObjectId;`). Add after it:
```typescript
staffMemberId?: Types.ObjectId | null;
dispatchGroupId?: Types.ObjectId | null;
surfacedAt?: Date | null;
```

- [ ] **Step 5: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 6: Commit**
```bash
git add src/modules/hotel/hotel.model.ts src/modules/hotel/hotel.interfaces.ts src/modules/orders/guest-order.model.ts src/modules/orders/orders.interfaces.ts
git commit -m "feat(wave1): add staffRbac/smartDispatching feature flags and GuestOrder dispatch fields"
```

---

## Task 2: Staff Module — Models + Interfaces

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. Stack: Node.js + TypeScript + Express + MongoDB/Mongoose. Each module lives in `src/modules/[name]/`. Mongoose model pattern: schema → `model.plugin(toJSON)` → `model.plugin(paginate)` → export. Interface pattern: `IXxx` (plain object), `IXxxDoc extends IXxx, Document`, `IXxxModel extends Model<IXxxDoc>`. Task 1 has already been completed (feature flags added to Hotel + new fields on GuestOrder). This task creates the `staff` module with two models.

**Files:**
- Create: `src/modules/staff/staff.interfaces.ts`
- Create: `src/modules/staff/staff-role.model.ts`
- Create: `src/modules/staff/staff-member.model.ts`
- Create: `src/modules/staff/index.ts`

- [ ] **Step 1: Create `src/modules/staff/staff.interfaces.ts`**
```typescript
import mongoose, { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export type StaffPermission =
  | 'orders:view' | 'orders:accept' | 'orders:complete' | 'orders:cancel'
  | 'bookings:view' | 'bookings:confirm' | 'bookings:cancel'
  | 'housekeeping:view' | 'housekeeping:manage'
  | 'maintenance:view' | 'maintenance:manage'
  | 'catalog:view' | 'catalog:manage'
  | 'staff:view' | 'staff:manage'
  | 'analytics:view' | 'settings:manage';

export const ALL_PERMISSIONS: StaffPermission[] = [
  'orders:view', 'orders:accept', 'orders:complete', 'orders:cancel',
  'bookings:view', 'bookings:confirm', 'bookings:cancel',
  'housekeeping:view', 'housekeeping:manage',
  'maintenance:view', 'maintenance:manage',
  'catalog:view', 'catalog:manage',
  'staff:view', 'staff:manage',
  'analytics:view', 'settings:manage',
];

export interface IStaffRole {
  hotelId: mongoose.Types.ObjectId | null;
  name: string;
  permissions: StaffPermission[];
  visibleModules: string[];
  isTemplate: boolean;
}

export interface IStaffRoleDoc extends IStaffRole, Document {}

export interface IStaffRoleModel extends Model<IStaffRoleDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface IStaffMember {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  pin: string;
  roleId: mongoose.Types.ObjectId;
  groupIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

export interface IStaffMemberDoc extends IStaffMember, Document {
  isPinMatch(pin: string): Promise<boolean>;
}

export interface IStaffMemberModel extends Model<IStaffMemberDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewStaffRole = Pick<IStaffRole, 'name' | 'permissions' | 'visibleModules'>;
export type UpdateStaffRole = Partial<NewStaffRole>;
export type NewStaffMember = Pick<IStaffMember, 'name' | 'pin' | 'roleId' | 'groupIds'>;
export type UpdateStaffMember = Partial<Pick<IStaffMember, 'name' | 'roleId' | 'groupIds' | 'isActive'>> & { pin?: string };
```

- [ ] **Step 2: Create `src/modules/staff/staff-role.model.ts`**
```typescript
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ALL_PERMISSIONS, IStaffRoleDoc, IStaffRoleModel } from './staff.interfaces';

const staffRoleSchema = new mongoose.Schema<IStaffRoleDoc, IStaffRoleModel>(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      default: null,
    },
    name: { type: String, required: true, trim: true },
    permissions: { type: [String], enum: ALL_PERMISSIONS, default: [] },
    visibleModules: { type: [String], default: [] },
    isTemplate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

staffRoleSchema.plugin(toJSON);
staffRoleSchema.plugin(paginate);

const StaffRole = mongoose.model<IStaffRoleDoc, IStaffRoleModel>('StaffRole', staffRoleSchema);
export default StaffRole;
```

- [ ] **Step 3: Create `src/modules/staff/staff-member.model.ts`**
```typescript
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IStaffMemberDoc, IStaffMemberModel } from './staff.interfaces';

const staffMemberSchema = new mongoose.Schema<IStaffMemberDoc, IStaffMemberModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    name: { type: String, required: true, trim: true },
    pin: { type: String, required: true, private: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'StaffRole' },
    groupIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'NotificationGroup', default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  { timestamps: true }
);

staffMemberSchema.index({ hotelId: 1, isActive: 1 });

staffMemberSchema.method('isPinMatch', async function (pin: string): Promise<boolean> {
  return bcrypt.compare(pin, this.pin);
});

staffMemberSchema.pre('save', async function (next) {
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 8);
  }
  next();
});

staffMemberSchema.plugin(toJSON);
staffMemberSchema.plugin(paginate);

const StaffMember = mongoose.model<IStaffMemberDoc, IStaffMemberModel>('StaffMember', staffMemberSchema);
export default StaffMember;
```

- [ ] **Step 4: Create `src/modules/staff/index.ts`**
```typescript
export { default as StaffMember } from './staff-member.model';
export { default as StaffRole } from './staff-role.model';
export * from './staff.interfaces';
```

- [ ] **Step 5: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 6: Commit**
```bash
git add src/modules/staff/
git commit -m "feat(wave1): add StaffRole and StaffMember models with bcrypt PIN hashing"
```

---

## Task 3: Dispatch Module — Models + Interfaces

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. Stack: Node.js + TypeScript + Express + MongoDB/Mongoose. Module pattern: `interfaces.ts → model.ts → index.ts`. Models use toJSON + paginate plugins (imported from `../toJSON/toJSON` and `../paginate/paginate`). Tasks 1 and 2 are complete. This task creates the `dispatch` module with two models.

**Files:**
- Create: `src/modules/dispatch/dispatch.interfaces.ts`
- Create: `src/modules/dispatch/notification-group.model.ts`
- Create: `src/modules/dispatch/dispatch-rule.model.ts`
- Create: `src/modules/dispatch/index.ts`

- [ ] **Step 1: Create `src/modules/dispatch/dispatch.interfaces.ts`**
```typescript
import mongoose, { Document, Model } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface INotificationGroup {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  emailAddresses: string[];
  sseEnabled: boolean;
}

export interface INotificationGroupDoc extends INotificationGroup, Document {}

export interface INotificationGroupModel extends Model<INotificationGroupDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type DispatchEventType = 'order' | 'booking' | 'housekeeping' | 'maintenance';

export interface IDispatchRuleConditions {
  categoryIds: mongoose.Types.ObjectId[];
  itemIds: mongoose.Types.ObjectId[];
  eventTypes: DispatchEventType[];
}

export interface IDispatchRule {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  priority: number;
  conditions: IDispatchRuleConditions;
  targetGroupId: mongoose.Types.ObjectId;
  escalationSeconds: number;
  active: boolean;
}

export interface IDispatchRuleDoc extends IDispatchRule, Document {}

export interface IDispatchRuleModel extends Model<IDispatchRuleDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewNotificationGroup = Pick<INotificationGroup, 'name' | 'emailAddresses' | 'sseEnabled'>;
export type UpdateNotificationGroup = Partial<NewNotificationGroup>;
export type NewDispatchRule = Pick<IDispatchRule, 'name' | 'priority' | 'conditions' | 'targetGroupId' | 'escalationSeconds'>;
export type UpdateDispatchRule = Partial<Pick<IDispatchRule, 'name' | 'priority' | 'conditions' | 'targetGroupId' | 'escalationSeconds' | 'active'>>;

export interface IRouteResult {
  groupId: string | null;
  groupEmails: string[];
  escalationSeconds: number;
  sseEnabled: boolean;
}
```

- [ ] **Step 2: Create `src/modules/dispatch/notification-group.model.ts`**
```typescript
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { INotificationGroupDoc, INotificationGroupModel } from './dispatch.interfaces';

const notificationGroupSchema = new mongoose.Schema<INotificationGroupDoc, INotificationGroupModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    name: { type: String, required: true, trim: true },
    emailAddresses: { type: [String], default: [] },
    sseEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationGroupSchema.index({ hotelId: 1 });
notificationGroupSchema.plugin(toJSON);
notificationGroupSchema.plugin(paginate);

const NotificationGroup = mongoose.model<INotificationGroupDoc, INotificationGroupModel>(
  'NotificationGroup',
  notificationGroupSchema
);
export default NotificationGroup;
```

- [ ] **Step 3: Create `src/modules/dispatch/dispatch-rule.model.ts`**
```typescript
import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IDispatchRuleDoc, IDispatchRuleModel } from './dispatch.interfaces';

const conditionsSchema = new mongoose.Schema(
  {
    categoryIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    itemIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    eventTypes: {
      type: [String],
      enum: ['order', 'booking', 'housekeeping', 'maintenance'],
      default: ['order'],
    },
  },
  { _id: false }
);

const dispatchRuleSchema = new mongoose.Schema<IDispatchRuleDoc, IDispatchRuleModel>(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
    name: { type: String, required: true, trim: true },
    priority: { type: Number, required: true, default: 0 },
    conditions: { type: conditionsSchema, required: true },
    targetGroupId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'NotificationGroup' },
    escalationSeconds: { type: Number, default: 30 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dispatchRuleSchema.index({ hotelId: 1, priority: 1 });
dispatchRuleSchema.plugin(toJSON);
dispatchRuleSchema.plugin(paginate);

const DispatchRule = mongoose.model<IDispatchRuleDoc, IDispatchRuleModel>('DispatchRule', dispatchRuleSchema);
export default DispatchRule;
```

- [ ] **Step 4: Create `src/modules/dispatch/index.ts`**
```typescript
export { default as NotificationGroup } from './notification-group.model';
export { default as DispatchRule } from './dispatch-rule.model';
export * from './dispatch.interfaces';
```

- [ ] **Step 5: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add src/modules/dispatch/
git commit -m "feat(wave1): add NotificationGroup and DispatchRule models"
```

---

## Task 4: Staff Service + Controller + Routes (CRUD)

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. Stack: Node.js + TypeScript + Express + MongoDB/Mongoose. Service functions throw `ApiError` (from `src/modules/errors/ApiError.ts`) with `http-status` codes. Controllers use `catchAsync` (from `src/modules/utils/catchAsync.ts`). Routes import `{ validate }` from `../../modules/validate`, `{ auth }` from `../../modules/auth`, and `{ isHotelOwner }` from `../../modules/middleware`. Tasks 1, 2, 3 are done: models exist at `src/modules/staff/` and `src/modules/dispatch/`. This task implements full CRUD for StaffRole and StaffMember.

**Files:**
- Create: `src/modules/staff/staff.validation.ts`
- Create: `src/modules/staff/staff.service.ts`
- Create: `src/modules/staff/staff.controller.ts`
- Create: `src/routes/v1/staff.route.ts`
- Modify: `src/modules/staff/index.ts`
- Modify: `src/routes/v1/index.ts`

- [ ] **Step 1: Create `src/modules/staff/staff.validation.ts`**
```typescript
import Joi from 'joi';
import { ALL_PERMISSIONS } from './staff.interfaces';

const createRole = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    permissions: Joi.array().items(Joi.string().valid(...ALL_PERMISSIONS)).default([]),
    visibleModules: Joi.array().items(Joi.string()).default([]),
  }),
};

const updateRole = {
  params: Joi.object().keys({ roleId: Joi.string().required() }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      permissions: Joi.array().items(Joi.string().valid(...ALL_PERMISSIONS)),
      visibleModules: Joi.array().items(Joi.string()),
    })
    .min(1),
};

const createMember = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    pin: Joi.string().length(4).pattern(/^\d+$/).required(),
    roleId: Joi.string().required(),
    groupIds: Joi.array().items(Joi.string()).default([]),
  }),
};

const updateMember = {
  params: Joi.object().keys({ memberId: Joi.string().required() }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      pin: Joi.string().length(4).pattern(/^\d+$/),
      roleId: Joi.string(),
      groupIds: Joi.array().items(Joi.string()),
      isActive: Joi.boolean(),
    })
    .min(1),
};

const verifyPin = {
  body: Joi.object().keys({
    pin: Joi.string().length(4).pattern(/^\d+$/).required(),
  }),
};

export default { createRole, updateRole, createMember, updateMember, verifyPin };
```

- [ ] **Step 2: Create `src/modules/staff/staff.service.ts`**
```typescript
import httpStatus from 'http-status';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import ApiError from '../errors/ApiError';
import config from '../../config/config';
import StaffRole from './staff-role.model';
import StaffMember from './staff-member.model';
import { NewStaffRole, UpdateStaffRole, NewStaffMember, UpdateStaffMember, StaffPermission } from './staff.interfaces';

// ─── Roles ────────────────────────────────────────────────────────────────────

export const createRole = async (hotelId: string, body: NewStaffRole) => {
  return StaffRole.create({ ...body, hotelId });
};

export const getRoles = async (hotelId: string) => {
  return StaffRole.find({ $or: [{ hotelId }, { isTemplate: true }] }).sort({ name: 1 });
};

export const updateRole = async (hotelId: string, roleId: string, body: UpdateStaffRole) => {
  const role = await StaffRole.findOne({ _id: roleId, hotelId, isTemplate: false });
  if (!role) throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  Object.assign(role, body);
  await role.save();
  return role;
};

export const deleteRole = async (hotelId: string, roleId: string) => {
  const inUse = await StaffMember.exists({ hotelId, roleId });
  if (inUse) throw new ApiError(httpStatus.CONFLICT, 'Role is assigned to one or more staff members');
  const deleted = await StaffRole.findOneAndDelete({ _id: roleId, hotelId, isTemplate: false });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
};

// ─── Members ─────────────────────────────────────────────────────────────────

const isPinTaken = async (hotelId: string, pin: string, excludeId?: string): Promise<boolean> => {
  const members = await StaffMember.find({ hotelId, isActive: true }).select('+pin');
  for (const member of members) {
    if (excludeId && String(member._id) === excludeId) continue;
    if (await bcrypt.compare(pin, member.pin)) return true;
  }
  return false;
};

export const createMember = async (hotelId: string, createdBy: string, body: NewStaffMember) => {
  const taken = await isPinTaken(hotelId, body.pin);
  if (taken) throw new ApiError(httpStatus.CONFLICT, 'PIN is already in use by another staff member');
  return StaffMember.create({ ...body, hotelId, createdBy });
};

export const getMembers = async (hotelId: string) => {
  return StaffMember.find({ hotelId })
    .populate('roleId', 'name permissions visibleModules')
    .sort({ name: 1 });
};

export const updateMember = async (hotelId: string, memberId: string, body: UpdateStaffMember) => {
  const member = await StaffMember.findOne({ _id: memberId, hotelId }).select('+pin');
  if (!member) throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
  if (body.pin) {
    const taken = await isPinTaken(hotelId, body.pin, memberId);
    if (taken) throw new ApiError(httpStatus.CONFLICT, 'PIN is already in use by another staff member');
  }
  Object.assign(member, body);
  await member.save();
  return StaffMember.findById(memberId).populate('roleId', 'name permissions visibleModules');
};

export const deleteMember = async (hotelId: string, memberId: string) => {
  const deleted = await StaffMember.findOneAndDelete({ _id: memberId, hotelId });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
};

// ─── PIN Verification ────────────────────────────────────────────────────────

export interface IStaffSessionPayload {
  staffMemberId: string;
  name: string;
  permissions: StaffPermission[];
  groupIds: string[];
  visibleModules: string[];
  token: string; // short-lived JWT stored in tablet memory
}

export const verifyPin = async (hotelId: string, pin: string): Promise<IStaffSessionPayload> => {
  const members = await StaffMember.find({ hotelId, isActive: true })
    .select('+pin')
    .populate<{ roleId: { permissions: StaffPermission[]; visibleModules: string[] } }>(
      'roleId',
      'permissions visibleModules'
    );

  for (const member of members) {
    if (!(await bcrypt.compare(pin, member.pin))) continue;

    const role = member.roleId as any;
    const permissions: StaffPermission[] = role?.permissions ?? [];
    const visibleModules: string[] = role?.visibleModules ?? [];

    const token = jwt.sign(
      {
        sub: String(member._id),
        hotelId,
        type: 'staff-session',
        permissions,
        groupIds: member.groupIds.map(String),
      },
      config.jwt.secret,
      { expiresIn: '8h' }
    );

    return {
      staffMemberId: String(member._id),
      name: member.name,
      permissions,
      groupIds: member.groupIds.map(String),
      visibleModules,
      token,
    };
  }

  throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid PIN');
};
```

- [ ] **Step 3: Create `src/modules/staff/staff.controller.ts`**
```typescript
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import * as staffService from './staff.service';

export const createRole = catchAsync(async (req: Request, res: Response) => {
  const role = await staffService.createRole(req.params['hotelId'], req.body);
  res.status(httpStatus.CREATED).json(role);
});

export const getRoles = catchAsync(async (req: Request, res: Response) => {
  const roles = await staffService.getRoles(req.params['hotelId']);
  res.json(roles);
});

export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const role = await staffService.updateRole(req.params['hotelId'], req.params['roleId'], req.body);
  res.json(role);
});

export const deleteRole = catchAsync(async (req: Request, res: Response) => {
  await staffService.deleteRole(req.params['hotelId'], req.params['roleId']);
  res.status(httpStatus.NO_CONTENT).send();
});

export const createMember = catchAsync(async (req: Request, res: Response) => {
  const member = await staffService.createMember(req.params['hotelId'], (req.user as any).id, req.body);
  res.status(httpStatus.CREATED).json(member);
});

export const getMembers = catchAsync(async (req: Request, res: Response) => {
  const members = await staffService.getMembers(req.params['hotelId']);
  res.json(members);
});

export const updateMember = catchAsync(async (req: Request, res: Response) => {
  const member = await staffService.updateMember(req.params['hotelId'], req.params['memberId'], req.body);
  res.json(member);
});

export const deleteMember = catchAsync(async (req: Request, res: Response) => {
  await staffService.deleteMember(req.params['hotelId'], req.params['memberId']);
  res.status(httpStatus.NO_CONTENT).send();
});

export const verifyPin = catchAsync(async (req: Request, res: Response) => {
  const result = await staffService.verifyPin(req.params['hotelId'], req.body.pin);
  res.json(result);
});
```

- [ ] **Step 4: Create `src/routes/v1/staff.route.ts`**
```typescript
import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import * as staffController from '../../modules/staff/staff.controller';
import staffValidation from '../../modules/staff/staff.validation';

const router: Router = express.Router();

// PIN verify — no user auth needed; hotel scoped via :hotelId param
router.post('/hotels/:hotelId/staff/verify-pin', validate(staffValidation.verifyPin), staffController.verifyPin);

// Roles
router.get('/hotels/:hotelId/staff/roles', auth(), isHotelOwner, staffController.getRoles);
router.post('/hotels/:hotelId/staff/roles', auth(), isHotelOwner, validate(staffValidation.createRole), staffController.createRole);
router.patch('/hotels/:hotelId/staff/roles/:roleId', auth(), isHotelOwner, validate(staffValidation.updateRole), staffController.updateRole);
router.delete('/hotels/:hotelId/staff/roles/:roleId', auth(), isHotelOwner, staffController.deleteRole);

// Members
router.get('/hotels/:hotelId/staff/members', auth(), isHotelOwner, staffController.getMembers);
router.post('/hotels/:hotelId/staff/members', auth(), isHotelOwner, validate(staffValidation.createMember), staffController.createMember);
router.patch('/hotels/:hotelId/staff/members/:memberId', auth(), isHotelOwner, validate(staffValidation.updateMember), staffController.updateMember);
router.delete('/hotels/:hotelId/staff/members/:memberId', auth(), isHotelOwner, staffController.deleteMember);

export default router;
```

- [ ] **Step 5: Register routes in `src/routes/v1/index.ts`**

Add import after the other route imports:
```typescript
import staffRoute from './staff.route';
```

Add to `defaultIRoute` array (anywhere after `maintenanceRoute`):
```typescript
{
  path: '/',
  route: staffRoute,
},
```

> Note: mounting at `'/'` keeps full paths like `/hotels/:hotelId/staff/members` — no double prefix.

- [ ] **Step 6: Update `src/modules/staff/index.ts`** to also export the service:
```typescript
export { default as StaffMember } from './staff-member.model';
export { default as StaffRole } from './staff-role.model';
export * from './staff.interfaces';
export * as staffService from './staff.service';
```

- [ ] **Step 7: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 8: Smoke-test with curl (server must be running)**
```bash
# Should return 401 (no auth)
curl -X GET http://localhost:3000/v1/hotels/SOME_HOTEL_ID/staff/members

# Should return 400 (missing body)
curl -X POST http://localhost:3000/v1/hotels/SOME_HOTEL_ID/staff/verify-pin
```

- [ ] **Step 9: Commit**
```bash
git add src/modules/staff/ src/routes/v1/staff.route.ts src/routes/v1/index.ts
git commit -m "feat(wave1): staff RBAC service, controller and routes (CRUD + PIN verify)"
```

---

## Task 5: Dispatch Service + Controller + Routes (CRUD)

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. Stack: Node.js + TypeScript + Express + MongoDB/Mongoose. Service pattern: async functions, throw `ApiError`. Controller pattern: thin wrappers using `catchAsync`. Routes import `{ validate }` from `../../modules/validate`, `{ auth }` from `../../modules/auth`, `{ isHotelOwner }` from `../../modules/middleware`. Tasks 1-4 are done. The `dispatch` module has models at `src/modules/dispatch/`. This task implements CRUD for NotificationGroup and DispatchRule.

**Files:**
- Create: `src/modules/dispatch/dispatch.validation.ts`
- Create: `src/modules/dispatch/dispatch.service.ts`
- Create: `src/modules/dispatch/dispatch.controller.ts`
- Create: `src/routes/v1/dispatch.route.ts`
- Modify: `src/modules/dispatch/index.ts`
- Modify: `src/routes/v1/index.ts`

- [ ] **Step 1: Create `src/modules/dispatch/dispatch.validation.ts`**
```typescript
import Joi from 'joi';

const createGroup = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    emailAddresses: Joi.array().items(Joi.string().email()).default([]),
    sseEnabled: Joi.boolean().default(true),
  }),
};

const updateGroup = {
  params: Joi.object().keys({ groupId: Joi.string().required() }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      emailAddresses: Joi.array().items(Joi.string().email()),
      sseEnabled: Joi.boolean(),
    })
    .min(1),
};

const conditionsSchema = Joi.object({
  categoryIds: Joi.array().items(Joi.string()).default([]),
  itemIds: Joi.array().items(Joi.string()).default([]),
  eventTypes: Joi.array()
    .items(Joi.string().valid('order', 'booking', 'housekeeping', 'maintenance'))
    .min(1)
    .required(),
});

const createRule = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    priority: Joi.number().integer().min(0).required(),
    conditions: conditionsSchema.required(),
    targetGroupId: Joi.string().required(),
    escalationSeconds: Joi.number().integer().min(5).default(30),
  }),
};

const updateRule = {
  params: Joi.object().keys({ ruleId: Joi.string().required() }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      priority: Joi.number().integer().min(0),
      conditions: conditionsSchema,
      targetGroupId: Joi.string(),
      escalationSeconds: Joi.number().integer().min(5),
      active: Joi.boolean(),
    })
    .min(1),
};

export default { createGroup, updateGroup, createRule, updateRule };
```

- [ ] **Step 2: Create `src/modules/dispatch/dispatch.service.ts`**
```typescript
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../errors/ApiError';
import NotificationGroup from './notification-group.model';
import DispatchRule from './dispatch-rule.model';
import { Hotel } from '../hotel';
import {
  NewNotificationGroup, UpdateNotificationGroup,
  NewDispatchRule, UpdateDispatchRule,
  IRouteResult, DispatchEventType,
} from './dispatch.interfaces';

// ─── NotificationGroup CRUD ───────────────────────────────────────────────────

export const createGroup = async (hotelId: string, body: NewNotificationGroup) => {
  return NotificationGroup.create({ ...body, hotelId });
};

export const getGroups = async (hotelId: string) => {
  return NotificationGroup.find({ hotelId }).sort({ name: 1 });
};

export const updateGroup = async (hotelId: string, groupId: string, body: UpdateNotificationGroup) => {
  const group = await NotificationGroup.findOne({ _id: groupId, hotelId });
  if (!group) throw new ApiError(httpStatus.NOT_FOUND, 'Notification group not found');
  Object.assign(group, body);
  await group.save();
  return group;
};

export const deleteGroup = async (hotelId: string, groupId: string) => {
  const inUse = await DispatchRule.exists({ hotelId, targetGroupId: groupId });
  if (inUse) throw new ApiError(httpStatus.CONFLICT, 'Group is referenced by one or more dispatch rules');
  const deleted = await NotificationGroup.findOneAndDelete({ _id: groupId, hotelId });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Notification group not found');
};

// ─── DispatchRule CRUD ────────────────────────────────────────────────────────

export const createRule = async (hotelId: string, body: NewDispatchRule) => {
  const group = await NotificationGroup.findOne({ _id: body.targetGroupId, hotelId });
  if (!group) throw new ApiError(httpStatus.NOT_FOUND, 'Target notification group not found');
  return DispatchRule.create({ ...body, hotelId, active: true });
};

export const getRules = async (hotelId: string) => {
  return DispatchRule.find({ hotelId })
    .populate('targetGroupId', 'name sseEnabled emailAddresses')
    .sort({ priority: 1 });
};

export const updateRule = async (hotelId: string, ruleId: string, body: UpdateDispatchRule) => {
  if (body.targetGroupId) {
    const group = await NotificationGroup.findOne({ _id: body.targetGroupId, hotelId });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, 'Target notification group not found');
  }
  const rule = await DispatchRule.findOne({ _id: ruleId, hotelId });
  if (!rule) throw new ApiError(httpStatus.NOT_FOUND, 'Dispatch rule not found');
  Object.assign(rule, body);
  await rule.save();
  return rule;
};

export const deleteRule = async (hotelId: string, ruleId: string) => {
  const deleted = await DispatchRule.findOneAndDelete({ _id: ruleId, hotelId });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Dispatch rule not found');
};

// ─── Dispatch Routing ─────────────────────────────────────────────────────────

/**
 * Evaluate dispatch rules for an incoming event.
 * Returns the matched group (or hotel fallback) with escalation config.
 *
 * @param hotelId  Hotel being evaluated
 * @param eventType  'order' | 'booking' | 'housekeeping' | 'maintenance'
 * @param categoryId  Category of the item (for order events)
 * @param itemId  Specific item (for order events)
 */
export const route = async (
  hotelId: string,
  eventType: DispatchEventType,
  categoryId?: string,
  itemId?: string
): Promise<IRouteResult> => {
  const rules = await DispatchRule.find({ hotelId, active: true })
    .populate<{ targetGroupId: { _id: mongoose.Types.ObjectId; sseEnabled: boolean; emailAddresses: string[] } }>(
      'targetGroupId',
      'sseEnabled emailAddresses'
    )
    .sort({ priority: 1 });

  for (const rule of rules) {
    const { conditions } = rule;

    if (!conditions.eventTypes.includes(eventType)) continue;

    if (itemId && conditions.itemIds.length > 0) {
      if (!conditions.itemIds.map(String).includes(itemId)) continue;
    }

    if (categoryId && conditions.categoryIds.length > 0) {
      if (!conditions.categoryIds.map(String).includes(categoryId)) continue;
    }

    const group = rule.targetGroupId as any;
    return {
      groupId: String(group._id),
      groupEmails: group.emailAddresses ?? [],
      escalationSeconds: rule.escalationSeconds,
      sseEnabled: group.sseEnabled,
    };
  }

  // Fallback: no rule matched — use hotel's orders.emails, no SSE group
  const hotel = await Hotel.findById(hotelId).select('orders.emails');
  return {
    groupId: null,
    groupEmails: (hotel as any)?.orders?.emails ?? [],
    escalationSeconds: 30,
    sseEnabled: false,
  };
};
```

- [ ] **Step 3: Create `src/modules/dispatch/dispatch.controller.ts`**
```typescript
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import * as dispatchService from './dispatch.service';

// Groups
export const createGroup = catchAsync(async (req: Request, res: Response) => {
  const group = await dispatchService.createGroup(req.params['hotelId'], req.body);
  res.status(httpStatus.CREATED).json(group);
});

export const getGroups = catchAsync(async (req: Request, res: Response) => {
  const groups = await dispatchService.getGroups(req.params['hotelId']);
  res.json(groups);
});

export const updateGroup = catchAsync(async (req: Request, res: Response) => {
  const group = await dispatchService.updateGroup(req.params['hotelId'], req.params['groupId'], req.body);
  res.json(group);
});

export const deleteGroup = catchAsync(async (req: Request, res: Response) => {
  await dispatchService.deleteGroup(req.params['hotelId'], req.params['groupId']);
  res.status(httpStatus.NO_CONTENT).send();
});

// Rules
export const createRule = catchAsync(async (req: Request, res: Response) => {
  const rule = await dispatchService.createRule(req.params['hotelId'], req.body);
  res.status(httpStatus.CREATED).json(rule);
});

export const getRules = catchAsync(async (req: Request, res: Response) => {
  const rules = await dispatchService.getRules(req.params['hotelId']);
  res.json(rules);
});

export const updateRule = catchAsync(async (req: Request, res: Response) => {
  const rule = await dispatchService.updateRule(req.params['hotelId'], req.params['ruleId'], req.body);
  res.json(rule);
});

export const deleteRule = catchAsync(async (req: Request, res: Response) => {
  await dispatchService.deleteRule(req.params['hotelId'], req.params['ruleId']);
  res.status(httpStatus.NO_CONTENT).send();
});
```

- [ ] **Step 4: Create `src/routes/v1/dispatch.route.ts`**
```typescript
import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { isHotelOwner } from '../../modules/middleware';
import * as dispatchController from '../../modules/dispatch/dispatch.controller';
import dispatchValidation from '../../modules/dispatch/dispatch.validation';

const router: Router = express.Router();

// Notification Groups
router.get('/hotels/:hotelId/dispatch/groups', auth(), isHotelOwner, dispatchController.getGroups);
router.post('/hotels/:hotelId/dispatch/groups', auth(), isHotelOwner, validate(dispatchValidation.createGroup), dispatchController.createGroup);
router.patch('/hotels/:hotelId/dispatch/groups/:groupId', auth(), isHotelOwner, validate(dispatchValidation.updateGroup), dispatchController.updateGroup);
router.delete('/hotels/:hotelId/dispatch/groups/:groupId', auth(), isHotelOwner, dispatchController.deleteGroup);

// Dispatch Rules
router.get('/hotels/:hotelId/dispatch/rules', auth(), isHotelOwner, dispatchController.getRules);
router.post('/hotels/:hotelId/dispatch/rules', auth(), isHotelOwner, validate(dispatchValidation.createRule), dispatchController.createRule);
router.patch('/hotels/:hotelId/dispatch/rules/:ruleId', auth(), isHotelOwner, validate(dispatchValidation.updateRule), dispatchController.updateRule);
router.delete('/hotels/:hotelId/dispatch/rules/:ruleId', auth(), isHotelOwner, dispatchController.deleteRule);

export default router;
```

- [ ] **Step 5: Register in `src/routes/v1/index.ts`**

Add import:
```typescript
import dispatchRoute from './dispatch.route';
```

Add to `defaultIRoute`:
```typescript
{
  path: '/',
  route: dispatchRoute,
},
```

- [ ] **Step 6: Update `src/modules/dispatch/index.ts`**
```typescript
export { default as NotificationGroup } from './notification-group.model';
export { default as DispatchRule } from './dispatch-rule.model';
export * from './dispatch.interfaces';
export * as dispatchService from './dispatch.service';
```

- [ ] **Step 7: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 8: Commit**
```bash
git add src/modules/dispatch/ src/routes/v1/dispatch.route.ts src/routes/v1/index.ts
git commit -m "feat(wave1): dispatch CRUD service, controller and routes (NotificationGroup + DispatchRule)"
```

---

## Task 6: Device Token + Auth Middleware

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. Stack: Node.js + TypeScript + Express + JWT (`jsonwebtoken`). `config.jwt.secret` is the env `JWT_SECRET`. Tasks 1-5 are done. This task adds: (1) a `POST /v1/hotels/:hotelId/device-token` endpoint so managers can generate a 90-day device JWT for shared tablets; (2) `isDeviceAuth` middleware that verifies a device JWT from `Authorization: Bearer <token>`; (3) `staffAuth(...permissions)` middleware that verifies a staff-session JWT and checks permissions.

**Files:**
- Modify: `src/modules/hotel/hotel.service.ts` — add `generateDeviceToken`
- Modify: `src/modules/hotel/hotel.controller.ts` — add handler
- Modify: `src/routes/v1/hotel.route.ts` — add endpoint
- Create: `src/modules/middleware/isDeviceAuth.ts`
- Create: `src/modules/middleware/staffAuth.ts`
- Modify: `src/modules/middleware/index.ts` — export new middleware

- [ ] **Step 1: Add `generateDeviceToken` to `src/modules/hotel/hotel.service.ts`**

Open `hotel.service.ts` and add at the bottom (add `jwt` and `config` imports at the top if not already present):
```typescript
import jwt from 'jsonwebtoken';
import config from '../../config/config';

export const generateDeviceToken = (hotelId: string): string => {
  return jwt.sign({ hotelId, type: 'device' }, config.jwt.secret, { expiresIn: '90d' });
};
```

- [ ] **Step 2: Add handler to `src/modules/hotel/hotel.controller.ts`**

Add at the bottom of the file:
```typescript
export const generateDeviceToken = catchAsync(async (req: Request, res: Response) => {
  const token = hotelService.generateDeviceToken(req.params['hotelId']);
  res.json({ token });
});
```
(Make sure `hotelService` is imported — it should already be, since the controller calls service functions.)

- [ ] **Step 3: Add endpoint to `src/routes/v1/hotel.route.ts`**

Find where hotel routes are defined and add:
```typescript
router.post('/:hotelId/device-token', auth(), isHotelOwner, hotelController.generateDeviceToken);
```

- [ ] **Step 4: Create `src/modules/middleware/isDeviceAuth.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../../config/config';
import { ApiError } from '../errors';

declare global {
  namespace Express {
    interface Request {
      deviceSession?: { hotelId: string };
    }
  }
}

export const isDeviceAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device token required'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as any;
    if (payload.type !== 'device') {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type'));
    }
    req.deviceSession = { hotelId: payload.hotelId };
    next();
  } catch {
    next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired device token'));
  }
};
```

- [ ] **Step 5: Create `src/modules/middleware/staffAuth.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../../config/config';
import { ApiError } from '../errors';
import { StaffPermission } from '../staff/staff.interfaces';

declare global {
  namespace Express {
    interface Request {
      staffSession?: {
        staffMemberId: string;
        hotelId: string;
        permissions: StaffPermission[];
        groupIds: string[];
      };
    }
  }
}

export const staffAuth =
  (...required: StaffPermission[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Staff session token required'));
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;
      if (payload.type !== 'staff-session') {
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type'));
      }

      const missing = required.filter((p) => !payload.permissions?.includes(p));
      if (missing.length > 0) {
        return next(new ApiError(httpStatus.FORBIDDEN, `Missing permissions: ${missing.join(', ')}`));
      }

      req.staffSession = {
        staffMemberId: payload.sub,
        hotelId: payload.hotelId,
        permissions: payload.permissions,
        groupIds: payload.groupIds ?? [],
      };
      next();
    } catch {
      next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired staff session'));
    }
  };
```

- [ ] **Step 6: Export from `src/modules/middleware/index.ts`**

Open `src/modules/middleware/index.ts` and add exports:
```typescript
export { isDeviceAuth } from './isDeviceAuth';
export { staffAuth } from './staffAuth';
```

- [ ] **Step 7: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 8: Commit**
```bash
git add src/modules/hotel/hotel.service.ts src/modules/hotel/hotel.controller.ts src/routes/v1/hotel.route.ts src/modules/middleware/isDeviceAuth.ts src/modules/middleware/staffAuth.ts src/modules/middleware/index.ts
git commit -m "feat(wave1): device token generation and isDeviceAuth/staffAuth middleware"
```

---

## Task 7: SSE Dual-Map Refactor

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. The SSE service is at `src/modules/orders/sse.service.ts`. Currently it has a single `Map<hotelId, Set<Response>>` called `clients`. All hotel staff see all events. Tasks 1-6 are done, including `isDeviceAuth` middleware at `src/modules/middleware/isDeviceAuth.ts`. This task refactors SSE to two maps: `adminClients` (keyed by hotelId, for manager dash — unchanged behavior) and `groupClients` (keyed by groupId, for staff tablets — new). A new endpoint `GET /v1/groups/:groupId/events` subscribes a tablet to its group's SSE stream using the device JWT.

**Files:**
- Modify: `src/modules/orders/sse.service.ts`
- Modify: `src/routes/v1/orders.route.ts`

- [ ] **Step 1: Rewrite `src/modules/orders/sse.service.ts`**
```typescript
import { Response } from 'express';

// Admin dashboard: keyed by hotelId — receives ALL events for the hotel
const adminClients = new Map<string, Set<Response>>();

// Staff tablets: keyed by groupId — receive only events routed to their group
const groupClients = new Map<string, Set<Response>>();

// ─── Shared helpers ───────────────────────────────────────────────────────────

const initSSEResponse = (res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(': heartbeat\n\n');
};

const writeToPool = (pool: Set<Response> | undefined, payload: string): void => {
  if (!pool || pool.size === 0) return;
  pool.forEach((res) => {
    try {
      res.write(payload);
    } catch {
      pool.delete(res);
    }
  });
};

// ─── Admin clients (manager dash) ────────────────────────────────────────────

export const addAdminSSEClient = (hotelId: string, res: Response): void => {
  initSSEResponse(res);
  if (!adminClients.has(hotelId)) adminClients.set(hotelId, new Set());
  adminClients.get(hotelId)!.add(res);
  res.on('close', () => removeAdminSSEClient(hotelId, res));
};

export const removeAdminSSEClient = (hotelId: string, res: Response): void => {
  const pool = adminClients.get(hotelId);
  if (!pool) return;
  pool.delete(res);
  if (pool.size === 0) adminClients.delete(hotelId);
};

export const sendAdminSSEEvent = (hotelId: string, event: string, data: unknown): void => {
  writeToPool(adminClients.get(hotelId), `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

export const pingAdminClients = (hotelId: string): void => {
  writeToPool(adminClients.get(hotelId), ': ping\n\n');
};

// ─── Group clients (staff tablets) ───────────────────────────────────────────

export const addGroupSSEClient = (groupId: string, res: Response): void => {
  initSSEResponse(res);
  if (!groupClients.has(groupId)) groupClients.set(groupId, new Set());
  groupClients.get(groupId)!.add(res);
  res.on('close', () => removeGroupSSEClient(groupId, res));
};

export const removeGroupSSEClient = (groupId: string, res: Response): void => {
  const pool = groupClients.get(groupId);
  if (!pool) return;
  pool.delete(res);
  if (pool.size === 0) groupClients.delete(groupId);
};

export const sendGroupSSEEvent = (groupId: string, event: string, data: unknown): void => {
  writeToPool(groupClients.get(groupId), `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

export const pingGroupClients = (groupId: string): void => {
  writeToPool(groupClients.get(groupId), ': ping\n\n');
};

// ─── Broadcast to both (used when an event should reach everyone) ─────────────

export const sendSSEEventToAll = (hotelId: string, groupId: string | null, event: string, data: unknown): void => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  writeToPool(adminClients.get(hotelId), payload);
  if (groupId) writeToPool(groupClients.get(groupId), payload);
};

// ─── Legacy alias — kept so existing callers compile without change ───────────
// Callers should migrate to sendAdminSSEEvent; this will be removed in Wave 2.
export const addSSEClient = addAdminSSEClient;
export const removeSSEClient = removeAdminSSEClient;
export const sendSSEEvent = sendAdminSSEEvent;
export const pingSSEClients = pingAdminClients;

// ─── Monitoring ───────────────────────────────────────────────────────────────

export const getSSEClientCount = (): number => {
  let count = 0;
  adminClients.forEach((pool) => { count += pool.size; });
  groupClients.forEach((pool) => { count += pool.size; });
  return count;
};
```

- [ ] **Step 2: Add group SSE endpoint to `src/routes/v1/orders.route.ts`**

At the top, add imports:
```typescript
import { isDeviceAuth } from '../../modules/middleware';
import { addGroupSSEClient } from '../../modules/orders/sse.service';
```

Add the route (place near the existing admin SSE route):
```typescript
// Tablet SSE — staff tablets subscribe to their group's event stream
router.get('/groups/:groupId/events', isDeviceAuth, (req, res) => {
  addGroupSSEClient(req.params['groupId'], res);
});
```

- [ ] **Step 3: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 4: Verify existing SSE still works**

Start the server and confirm existing `GET /v1/orders/hotels/:hotelId/events` still works (uses `addAdminSSEClient` via the legacy alias — the existing controller calls `addSSEClient` which aliases to `addAdminSSEClient`).

- [ ] **Step 5: Commit**
```bash
git add src/modules/orders/sse.service.ts src/routes/v1/orders.route.ts
git commit -m "feat(wave1): SSE dual-map refactor — separate adminClients and groupClients"
```

---

## Task 8: Dispatch Routing Integration + Tablet Order Routes

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. Tasks 1-7 are done. `dispatchService.route()` is at `src/modules/dispatch/dispatch.service.ts`. `sendSSEEventToAll()` is at `src/modules/orders/sse.service.ts`. `staffAuth` middleware is at `src/modules/middleware/staffAuth.ts`. The `placeOrder` function in `src/modules/orders/orders.service.ts` currently calls `sendSSEEvent(hotelId, 'rs:new-order', payload)`. This task: (1) hooks dispatch routing into `placeOrder` so the SSE event goes to the matched group; (2) records `dispatchGroupId` on the created GuestOrder; (3) adds tablet-specific order action routes (accept/advance/cancel) protected by `staffAuth`.

**Files:**
- Modify: `src/modules/orders/orders.service.ts`
- Modify: `src/routes/v1/orders.route.ts`

- [ ] **Step 1: Update `placeOrder` in `src/modules/orders/orders.service.ts`**

Add these imports at the top of `orders.service.ts` if not present:
```typescript
import { dispatchService } from '../dispatch';
import { sendSSEEventToAll, sendAdminSSEEvent } from './sse.service';
import { scheduleEscalation } from '../scheduler/escalation';
```

Find the section in `placeOrder` that calls `sendSSEEvent(hotelId, 'rs:new-order', payload)`. Replace it with:
```typescript
// Dispatch routing — find which notification group gets this order
// hotel variable may already exist earlier in placeOrder for settings lookup;
// if so reuse it. If not, add this query.
const hotelForDispatch = await Hotel.findById(hotelId).select('features orders');
let dispatchGroupId: string | null = null;

if ((hotelForDispatch as any)?.features?.smartDispatchingEnabled) {
  // Use first item from the saved order to determine category/item routing
  const firstOrderItem = order.items[0];
  const routeResult = await dispatchService.route(
    hotelId,
    'order',
    firstOrderItem?.itemId?.toString(),  // itemId doubles as a lookup key; categoryId resolved inside route()
    firstOrderItem?.itemId?.toString()
  );
  dispatchGroupId = routeResult.groupId;

  // Persist the resolved group on the order for surfacing scheduler
  await GuestOrder.updateOne({ _id: order._id }, { dispatchGroupId });

  scheduleEscalation(String(order._id), hotelId, dispatchGroupId, routeResult.escalationSeconds);
}

// Emit SSE to admin dash + matched group (if any)
sendSSEEventToAll(hotelId, dispatchGroupId, 'rs:new-order', {
  orderId: order.orderId,
  roomNumber: order.guestRoomNumber || order.roomNumber,
  itemCount: order.items.reduce((sum, i) => sum + i.qty, 0),
  total: order.total,
  note: order.note,
  payment: order.payment,
  scheduledFor: order.scheduledFor,
  createdAt: order.createdAt,
});
```

> Note: `dispatchService.route()` currently takes `itemId` for both categoryId and itemId params. For proper category-based matching to work you need the `categoryId` of the first ordered item. The catalog item is already loaded earlier in `placeOrder` to resolve price/modifiers — find that resolved item (likely named `catalogItem` or similar) and pass `catalogItem.categoryId.toString()` as the third argument instead.

- [ ] **Step 2: Add tablet order action routes to `src/routes/v1/orders.route.ts`**

Add imports:
```typescript
import { staffAuth } from '../../modules/middleware';
```

Add tablet routes (place after the existing hotel-auth order action routes):
```typescript
// ─── Tablet order actions (staff-session JWT) ─────────────────────────────────
router
  .route('/tablet/:orderId/accept')
  .post(staffAuth('orders:accept'), ordersController.acceptOrder);

router
  .route('/tablet/:orderId/advance')
  .post(staffAuth('orders:complete'), ordersController.advanceOrderStatus);

router
  .route('/tablet/:orderId/cancel')
  .post(staffAuth('orders:cancel'), ordersController.cancelOrder);
```

> The existing `acceptOrder`, `advanceOrderStatus`, `cancelOrder` controller functions work without changes — they just use `req.params.orderId`.

- [ ] **Step 3: Cancel escalation + record staffMemberId on status change**

At the top of `orders.service.ts`, add if not already imported from Step 1:
```typescript
import { cancelEscalation } from '../scheduler/escalation';
```

In `acceptOrder` function, after confirming the order exists and before saving:
```typescript
cancelEscalation(String(order._id));
// If request comes from a tablet (staffSession present), record who accepted
if (staffMemberId) {
  order.set('staffMemberId', staffMemberId);
}
```

Update the `acceptOrder` service function signature to accept an optional `staffMemberId`:
```typescript
export const acceptOrder = async (
  orderId: string,
  body: { acceptedEta: number; staffNote?: string },
  staffMemberId?: string
): Promise<IGuestOrderDoc> => { ... }
```

In `orders.controller.ts`, update the `acceptOrder` handler to pass `staffMemberId` if available from `req.staffSession`:
```typescript
export const acceptOrder = catchAsync(async (req: Request, res: Response) => {
  const staffMemberId = (req as any).staffSession?.staffMemberId;
  const order = await ordersService.acceptOrder(req.params['orderId'], req.body, staffMemberId);
  res.json(order);
});
```

In `cancelOrder` function, add `cancelEscalation` at the point the status changes from 'Awaiting confirmation':
```typescript
cancelEscalation(String(order._id));
```

- [ ] **Step 4: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 5: Commit**
```bash
git add src/modules/orders/orders.service.ts src/routes/v1/orders.route.ts
git commit -m "feat(wave1): integrate dispatch routing into order creation and add tablet order action routes"
```

---

## Task 9: Escalation Scheduler

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. The scheduler module is at `src/modules/scheduler/`. `node-cron` is already a dependency (used in `weeklyReport.ts`). `sendAdminSSEEvent` is exported from `src/modules/orders/sse.service.ts`. Tasks 1-8 are done. This task creates an in-memory escalation timer: 30 seconds after a new order, if it is still 'Awaiting confirmation', email the hotel's fallback emails and send an SSE escalation alert to the admin dash.

**Files:**
- Create: `src/modules/scheduler/escalation.ts`
- Modify: `src/index.ts` (no code change needed — escalation is invoked directly, not a cron job)

- [ ] **Step 1: Create `src/modules/scheduler/escalation.ts`**
```typescript
import { sendAdminSSEEvent } from '../orders/sse.service';
import GuestOrder from '../orders/guest-order.model';
import { Hotel } from '../hotel';
import { sendEmail } from '../email/email.service';
import logger from '../logger/logger';

// orderId → NodeJS.Timeout
const timers = new Map<string, NodeJS.Timeout>();

export const scheduleEscalation = (
  orderId: string,
  hotelId: string,
  groupId: string | null,
  delaySeconds: number
): void => {
  cancelEscalation(orderId); // clear any existing timer

  const timer = setTimeout(async () => {
    timers.delete(orderId);
    try {
      const order = await GuestOrder.findById(orderId).select('status orderId total');
      if (!order || order.status !== 'Awaiting confirmation') return;

      const hotel = await Hotel.findById(hotelId).select('orders.emails name');
      const emails: string[] = (hotel as any)?.orders?.emails ?? [];

      if (emails.length > 0) {
        await sendEmail({
          to: emails.join(','),
          subject: `[Escalation] Order ${order.orderId} unaccepted`,
          html: `<p>Order <strong>${order.orderId}</strong> (€${order.total}) has not been accepted within the required time. Please check the dashboard.</p>`,
        }).catch((err) => logger.error('Escalation email failed', err));
      }

      sendAdminSSEEvent(hotelId, 'rs:escalation-alert', {
        orderId: String(order._id),
        orderRef: order.orderId,
        total: order.total,
        firedAt: new Date(),
      });

      logger.warn(`Escalation fired for order ${order.orderId} (hotel ${hotelId})`);
    } catch (err) {
      logger.error('Escalation handler error', err);
    }
  }, delaySeconds * 1000);

  timers.set(orderId, timer);
};

export const cancelEscalation = (orderId: string): void => {
  const timer = timers.get(orderId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(orderId);
  }
};
```

- [ ] **Step 2: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 3: Commit**
```bash
git add src/modules/scheduler/escalation.ts
git commit -m "feat(wave1): in-memory escalation scheduler for unaccepted orders"
```

---

## Task 10: Scheduled Orders Surfacing

> **Standalone context for new chat:** Backend is at `infiora-backend-main/infiora-backend-main/`. `node-cron` is a dependency used in `src/modules/scheduler/weeklyReport.ts`. `GuestOrder` is at `src/modules/orders/guest-order.model.ts` and has `scheduledFor: Date` and `surfacedAt: Date | null` fields (added in Task 1). `sendSSEEventToAll` is exported from `src/modules/orders/sse.service.ts`. The scheduler is started in `src/index.ts` by calling `startWeeklyReportJob()`. This task creates a cron job that runs every minute and surfaces scheduled orders 15 minutes before their `scheduledFor` time.

**Files:**
- Create: `src/modules/scheduler/scheduledOrders.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create `src/modules/scheduler/scheduledOrders.ts`**
```typescript
import cron from 'node-cron';
import GuestOrder from '../orders/guest-order.model';
import { sendSSEEventToAll } from '../orders/sse.service';
import logger from '../logger/logger';

export const startScheduledOrdersJob = (): void => {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const surfaceAt = new Date(now.getTime() + 15 * 60 * 1000);

    const orders = await GuestOrder.find({
      status: 'Awaiting confirmation',
      scheduledFor: { $lte: surfaceAt },
      surfacedAt: null,
    }).select('orderId hotelId dispatchGroupId guestRoomNumber roomNumber total items payment scheduledFor');

    for (const order of orders) {
      await GuestOrder.updateOne({ _id: order._id }, { surfacedAt: now });

      sendSSEEventToAll(
        String(order.hotelId),
        order.dispatchGroupId ? String(order.dispatchGroupId) : null,
        'rs:new-order',
        {
          orderId: order.orderId,
          roomNumber: order.guestRoomNumber || order.roomNumber,
          itemCount: order.items.reduce((sum, i) => sum + i.qty, 0),
          total: order.total,
          payment: order.payment,
          scheduledFor: order.scheduledFor,
          surfacedAt: now,
        }
      );

      logger.info(`Scheduled order surfaced: ${order.orderId}`);
    }
  });

  logger.info('Scheduled orders cron job started (every 1 minute)');
};
```

- [ ] **Step 2: Start the job in `src/index.ts`**

Add import:
```typescript
import { startScheduledOrdersJob } from './modules/scheduler/scheduledOrders';
```

In the `mongoose.connect().then(...)` callback, inside the `if (config.env !== 'test')` block:
```typescript
if (config.env !== 'test') {
  startWeeklyReportJob();
  startScheduledOrdersJob();
}
```

- [ ] **Step 3: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add src/modules/scheduler/scheduledOrders.ts src/index.ts
git commit -m "feat(wave1): scheduled orders surfacing cron (15-min pre-surface)"
```

---

## Task 11: Dash — Staff Management Pages

> **Standalone context for new chat:** The infiora-dash frontend is at `infiora-dash-main/infiora-dash-main/`. It uses Next.js 14 App Router with TypeScript. Route files are at `src/app/[lang]/(private)/[route]/page.tsx` and just re-export from `src/views/[route]/pages/XxxPage.tsx`. The API base URL comes from environment config. Backend endpoints added in Tasks 1-10 follow the pattern `GET/POST/PATCH/DELETE /v1/hotels/:hotelId/staff/members`, `/staff/roles`, `/dispatch/groups`, `/dispatch/rules`. This task adds four management pages for Staff RBAC and Dispatching.

**Files:**
- Create: `src/app/[lang]/(private)/staff/page.tsx`
- Create: `src/app/[lang]/(private)/staff/roles/page.tsx`
- Create: `src/app/[lang]/(private)/staff/groups/page.tsx`
- Create: `src/app/[lang]/(private)/staff/dispatch/page.tsx`
- Create: `src/views/staff/pages/StaffPage.tsx`
- Create: `src/views/staff/pages/StaffRolesPage.tsx`
- Create: `src/views/staff/pages/NotificationGroupsPage.tsx`
- Create: `src/views/staff/pages/DispatchRulesPage.tsx`

- [ ] **Step 1: Create route pages** (all four follow the same minimal pattern)

`src/app/[lang]/(private)/staff/page.tsx`:
```typescript
import StaffPage from '@/views/staff/pages/StaffPage';
export default StaffPage;
```

`src/app/[lang]/(private)/staff/roles/page.tsx`:
```typescript
import StaffRolesPage from '@/views/staff/pages/StaffRolesPage';
export default StaffRolesPage;
```

`src/app/[lang]/(private)/staff/groups/page.tsx`:
```typescript
import NotificationGroupsPage from '@/views/staff/pages/NotificationGroupsPage';
export default NotificationGroupsPage;
```

`src/app/[lang]/(private)/staff/dispatch/page.tsx`:
```typescript
import DispatchRulesPage from '@/views/staff/pages/DispatchRulesPage';
export default DispatchRulesPage;
```

- [ ] **Step 2: Create `src/views/staff/pages/StaffPage.tsx`**

Look at an existing page like `src/views/orders/pages/OrdersPage.tsx` to understand how the dashboard fetches data and renders lists. Then implement:
```typescript
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
// import whatever UI components the dash uses (cards, tables, dialogs, buttons)
// — follow the pattern from an existing page like housekeeping or maintenance

const ALL_PERMISSIONS = [
  'orders:view','orders:accept','orders:complete','orders:cancel',
  'bookings:view','bookings:confirm','bookings:cancel',
  'housekeeping:view','housekeeping:manage',
  'maintenance:view','maintenance:manage',
  'catalog:view','catalog:manage',
  'staff:view','staff:manage',
  'analytics:view','settings:manage',
];

export default function StaffPage() {
  const hotelId = /* get from context/params — same pattern as OrdersPage */ '';
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const fetchMembers = async () => {
    const res = await axios.get(`/api/v1/hotels/${hotelId}/staff/members`);
    setMembers(res.data);
  };

  const fetchRoles = async () => {
    const res = await axios.get(`/api/v1/hotels/${hotelId}/staff/roles`);
    setRoles(res.data);
  };

  useEffect(() => {
    fetchMembers();
    fetchRoles();
  }, [hotelId]);

  const handleCreate = async (data: { name: string; pin: string; roleId: string; groupIds: string[] }) => {
    await axios.post(`/api/v1/hotels/${hotelId}/staff/members`, data);
    fetchMembers();
  };

  const handleUpdate = async (memberId: string, data: any) => {
    await axios.patch(`/api/v1/hotels/${hotelId}/staff/members/${memberId}`, data);
    fetchMembers();
  };

  const handleDelete = async (memberId: string) => {
    await axios.delete(`/api/v1/hotels/${hotelId}/staff/members/${memberId}`);
    fetchMembers();
  };

  // Render: table of members + "Add Staff Member" button that opens a dialog
  // Dialog fields: name (text), pin (4-digit, hidden), role (select from roles), groups (multi-select)
  return (
    <div>
      <h1>Staff Members</h1>
      {/* table + create/edit modal — follow existing dash component patterns */}
    </div>
  );
}
```

> Implement using the exact component library and patterns from existing pages (e.g., `src/views/housekeeping/` or `src/views/maintenance/`). Do NOT invent new patterns.

- [ ] **Step 3: Create `src/views/staff/pages/StaffRolesPage.tsx`**

Same structure as StaffPage but for roles. Endpoints: `GET/POST /hotels/:hotelId/staff/roles`, `PATCH/DELETE /hotels/:hotelId/staff/roles/:roleId`. The create/edit form has: name (text input) + permissions (checklist of all 16 permissions) + visibleModules (checklist of module names: orders, bookings, housekeeping, maintenance, catalog, analytics).

- [ ] **Step 4: Create `src/views/staff/pages/NotificationGroupsPage.tsx`**

Endpoints: `GET/POST /hotels/:hotelId/dispatch/groups`, `PATCH/DELETE /hotels/:hotelId/dispatch/groups/:groupId`. Form fields: name (text), emailAddresses (comma-separated or tag input), sseEnabled (toggle).

- [ ] **Step 5: Create `src/views/staff/pages/DispatchRulesPage.tsx`**

Endpoints: `GET/POST /hotels/:hotelId/dispatch/rules`, `PATCH/DELETE /hotels/:hotelId/dispatch/rules/:ruleId`. Form fields: name, priority (number), conditions.eventTypes (checkboxes), conditions.categoryIds (multi-select of categories), conditions.itemIds (multi-select of items), targetGroupId (select from groups), escalationSeconds (number, default 30), active (toggle).

Rules list ordered by priority. Include drag-to-reorder that updates priority via `PATCH` on drop.

- [ ] **Step 6: Add staff links to the sidebar**

Find the navigation/sidebar component (likely in `src/@layouts/` or `src/components/`). Add links to the four new routes gated on `hotel.features.staffRbacEnabled`.

- [ ] **Step 7: Commit**
```bash
git add src/app/\[lang\]/\(private\)/staff/ src/views/staff/
git commit -m "feat(wave1): staff management UI pages (members, roles, groups, dispatch rules)"
```

---

## Task 12: Dash — Tablet Mode

> **Standalone context for new chat:** The infiora-dash frontend is at `infiora-dash-main/infiora-dash-main/`. It uses Next.js 14 App Router. The layout for private pages is at `src/app/[lang]/(private)/layout.tsx` (includes sidebar, header). Tablet mode needs a DIFFERENT layout — full-screen, no sidebar. Tasks 1-11 are done. The backend device token endpoint is `POST /v1/hotels/:hotelId/device-token`. After PIN verify, the server returns `{ staffMemberId, name, permissions, groupIds, visibleModules, token }` — `token` is a staff session JWT stored in React state (not localStorage). The tablet subscribes to SSE at `GET /v1/groups/:groupId/events` using the device JWT as Bearer. Tablet order actions use `POST /v1/orders/tablet/:orderId/accept` etc. with the staff session JWT as Bearer.

**Files:**
- Create: `src/app/[lang]/(tablet)/layout.tsx`
- Create: `src/app/[lang]/(tablet)/tablet/[groupId]/page.tsx`
- Create: `src/views/tablet/pages/TabletPage.tsx`

- [ ] **Step 1: Create tablet layout `src/app/[lang]/(tablet)/layout.tsx`**
```typescript
export default function TabletLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0f0f0f', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create route page `src/app/[lang]/(tablet)/tablet/[groupId]/page.tsx`**
```typescript
import TabletPage from '@/views/tablet/pages/TabletPage';
export default TabletPage;
```

- [ ] **Step 3: Create `src/views/tablet/pages/TabletPage.tsx`**
```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';

interface StaffSession {
  staffMemberId: string;
  name: string;
  permissions: string[];
  groupIds: string[];
  token: string; // staff session JWT
}

interface TabletOrder {
  _id: string;
  orderId: string;
  roomNumber: string;
  items: { name: string; qty: number }[];
  total: number;
  payment: string;
  note?: string;
  scheduledFor?: string;
  status: string;
  createdAt: string;
}

export default function TabletPage() {
  const params = useParams();
  const groupId = params['groupId'] as string;

  // Device token is stored in localStorage (set once by manager)
  const deviceToken = typeof window !== 'undefined' ? localStorage.getItem('deviceToken') : null;

  const [session, setSession] = useState<StaffSession | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [orders, setOrders] = useState<TabletOrder[]>([]);
  const sseRef = useRef<EventSource | null>(null);

  // ─── PIN entry ──────────────────────────────────────────────────────────────

  // hotelId is embedded in the device token — we need it for the verify-pin call.
  // Decode JWT payload (no signature verify needed client-side, server verifies).
  const hotelId = (() => {
    try {
      if (!deviceToken) return null;
      const payload = JSON.parse(atob(deviceToken.split('.')[1]));
      return payload.hotelId as string;
    } catch { return null; }
  })();

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    setPin((p) => p + digit);
  };

  const handlePinClear = () => setPin('');

  useEffect(() => {
    if (pin.length === 4) {
      verifyPin(pin);
    }
  }, [pin]);

  const verifyPin = async (enteredPin: string) => {
    try {
      const res = await axios.post(`/api/v1/hotels/${hotelId}/staff/verify-pin`, { pin: enteredPin });
      setSession(res.data);
      setPinError('');
      loadOrders(groupId, res.data.token);
      startSSE(groupId, res.data.token);
    } catch {
      setPinError('Invalid PIN. Try again.');
      setPin('');
    }
  };

  // ─── Orders ─────────────────────────────────────────────────────────────────

  const loadOrders = async (gid: string, token: string) => {
    const res = await axios.get(`/api/v1/orders/hotels/${hotelId}?status=Awaiting confirmation&groupId=${gid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setOrders(res.data?.results ?? res.data ?? []);
  };

  const handleAccept = async (orderId: string) => {
    if (!session) return;
    await axios.post(
      `/api/v1/orders/tablet/${orderId}/accept`,
      { acceptedEta: 15 },
      { headers: { Authorization: `Bearer ${session.token}` } }
    );
    setOrders((prev) => prev.filter((o) => o._id !== orderId));
  };

  const handleCancel = async (orderId: string) => {
    if (!session) return;
    await axios.post(
      `/api/v1/orders/tablet/${orderId}/cancel`,
      {},
      { headers: { Authorization: `Bearer ${session.token}` } }
    );
    setOrders((prev) => prev.filter((o) => o._id !== orderId));
  };

  // ─── SSE ────────────────────────────────────────────────────────────────────

  const startSSE = (gid: string, _token: string) => {
    if (sseRef.current) sseRef.current.close();
    // SSE with device token as query param (EventSource doesn't support custom headers)
    const url = `/api/v1/groups/${gid}/events?token=${encodeURIComponent(deviceToken ?? '')}`;
    const es = new EventSource(url);
    es.addEventListener('rs:new-order', (e) => {
      const order = JSON.parse(e.data);
      setOrders((prev) => [order, ...prev.filter((o) => o.orderId !== order.orderId)]);
    });
    es.addEventListener('rs:order-updated', (e) => {
      const update = JSON.parse(e.data);
      setOrders((prev) =>
        prev.map((o) => (o.orderId === update.orderId ? { ...o, status: update.status } : o))
      );
    });
    sseRef.current = es;
  };

  useEffect(() => {
    return () => sseRef.current?.close();
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>
        <h2 style={{ marginBottom: 24 }}>Enter PIN</h2>
        <div style={{ fontSize: 32, letterSpacing: 12, marginBottom: 16 }}>
          {'●'.repeat(pin.length)}{'○'.repeat(4 - pin.length)}
        </div>
        {pinError && <p style={{ color: '#f87171', marginBottom: 12 }}>{pinError}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 80px)', gap: 12 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <button
              key={i}
              onClick={() => d === '⌫' ? handlePinClear() : d && handlePinDigit(d)}
              style={{ height: 80, fontSize: 24, borderRadius: 12, border: 'none', background: d ? '#1e1e2e' : 'transparent', color: '#fff', cursor: d ? 'pointer' : 'default' }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, color: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Orders — {session.name}</h2>
        <button onClick={() => setSession(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>
      {orders.length === 0 && <p style={{ color: '#888', textAlign: 'center', marginTop: 80 }}>No pending orders</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {orders.map((order) => (
          <div key={order._id} style={{ background: '#1e1e2e', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{order.orderId}</strong>
              <span>Room {order.roomNumber}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
              {order.items.map((item, i) => (
                <li key={i}>{item.qty}× {item.name}</li>
              ))}
            </ul>
            {order.note && <p style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>{order.note}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              {session.permissions.includes('orders:accept') && (
                <button onClick={() => handleAccept(order._id)} style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 16 }}>
                  Accept
                </button>
              )}
              {session.permissions.includes('orders:cancel') && (
                <button onClick={() => handleCancel(order._id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 16 }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

> Note on SSE auth: `EventSource` doesn't support custom headers. Pass the device token as a `?token=` query parameter. Update `src/routes/v1/orders.route.ts` group SSE handler to also accept the token from `req.query.token` if the Authorization header is missing.

- [ ] **Step 4: Update group SSE route to accept token from query param**

In `src/routes/v1/orders.route.ts`, update the group events route:
```typescript
import jwt from 'jsonwebtoken';
import config from '../../config/config';

router.get('/groups/:groupId/events', (req, res, next) => {
  // EventSource can't send headers — accept token from query param too
  const token = req.headers.authorization?.slice(7) || (req.query.token as string);
  if (!token) return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device token required'));
  try {
    const payload = jwt.verify(token, config.jwt.secret) as any;
    if (payload.type !== 'device') return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type'));
    (req as any).deviceSession = { hotelId: payload.hotelId };
    addGroupSSEClient(req.params['groupId'], res);
  } catch {
    next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid device token'));
  }
});
```

- [ ] **Step 5: Verify TypeScript compiles**
```bash
cd infiora-backend-main/infiora-backend-main
npx tsc --noEmit
```

- [ ] **Step 6: Manual test flow**
1. Start backend + dash
2. In dash: Settings → generate device token for a hotel
3. Store the token in localStorage: `localStorage.setItem('deviceToken', '<token>')`
4. Navigate to `/en/tablet/<groupId>`
5. Should see PIN pad
6. Create a staff member with a PIN via the staff management page
7. Enter PIN → should see staff name + empty order list
8. Place an order in the guest app → should appear as a card
9. Click Accept → card disappears from tablet

- [ ] **Step 7: Commit**
```bash
git add src/app/\[lang\]/\(tablet\)/ src/views/tablet/ src/routes/v1/orders.route.ts
git commit -m "feat(wave1): tablet mode with PIN pad, SSE order stream and order action buttons"
```

---

## Wave 1 Complete — Integration Checklist

Before marking Wave 1 shipped, verify end-to-end:

- [ ] Manager creates a StaffRole with `orders:view`, `orders:accept`, `orders:complete` permissions
- [ ] Manager creates a NotificationGroup "Kitchen Tablet" with `sseEnabled: true`
- [ ] Manager creates a StaffMember "Mario" with a 4-digit PIN, assigns the role, assigns to Kitchen Tablet group
- [ ] Manager creates a DispatchRule: `eventTypes: ['order']`, `targetGroupId: Kitchen Tablet`, `escalationSeconds: 30`
- [ ] Manager generates a device token, pastes it in the tablet's localStorage
- [ ] Tablet navigates to `/tablet/<kitchenGroupId>` — PIN pad visible
- [ ] Tablet enters Mario's PIN — order list visible, staff name shows
- [ ] Guest places an order in the app — order card appears on kitchen tablet SSE stream
- [ ] After 30 seconds without action — escalation email sent + `rs:escalation-alert` in admin dash SSE
- [ ] Mario clicks Accept on tablet — order disappears from 'Awaiting confirmation' list
- [ ] Admin dash SSE also received the `rs:new-order` event (dual-map confirmed)
- [ ] Guest schedules a breakfast pre-order for tomorrow 08:00 — does NOT appear in live queue immediately
- [ ] At 07:45 (15 min before) — order surfaces in kitchen tablet SSE stream
- [ ] Turning off `hotel.features.smartDispatchingEnabled` → new orders fall back to `hotel.orders.emails` (no group SSE)

## Wave 2 Preview Note

**partySize vs remaining capacity (explicit UX validation):** When a guest requests a party size that exceeds the remaining capacity for a shared-type slot, the current design returns a generic "slot unavailable" error. For better UX, add a pre-check before the atomic `findOneAndUpdate`: query `TimeSlot.remaining = maxPersons - bookedPersons` and if `remaining > 0` but `remaining < partySize`, return HTTP 409 with `{ code: 'INSUFFICIENT_CAPACITY', remaining, requested: partySize }` so the guest app can display "Only X spots left — reduce your party size or join the waitlist."

This is a Wave 2 addition. Add it in the booking engine task when `POST /v1/bookings` is implemented.
```
