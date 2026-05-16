import httpStatus from 'http-status';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ApiError from '../errors/ApiError';
import config from '../../config/config';
import { Hotel } from '../hotel';
import StaffRole from './staff-role.model';
import StaffMember from './staff-member.model';
import NotificationGroup from '../dispatch/notification-group.model';
import {
  NewStaffRole,
  UpdateStaffRole,
  NewStaffMember,
  UpdateStaffMember,
  StaffPermission,
  IStaffSessionPayload,
} from './staff.interfaces';
import { createAuditLog } from '../audit-log/audit-log.service';

// ─── Roles ────────────────────────────────────────────────────────────────────

export const createRole = async (hotelId: string, body: NewStaffRole) => {
  const role = await StaffRole.create({ ...body, hotelId });
  await createAuditLog({
    hotelId,
    actorType: 'user',
    action: 'staff.role-created',
    targetType: 'staff-role',
    targetId: String(role._id),
    summary: `Created staff role ${role.name}.`,
  });
  return role;
};

export const getRoles = async (hotelId: string) => {
  return StaffRole.find({ $or: [{ hotelId }, { isTemplate: true }] }).sort({ name: 1 });
};

export const getTemplates = async () => {
  return StaffRole.find({ isTemplate: true }).sort({ name: 1 });
};

export const updateRole = async (hotelId: string, roleId: string, body: UpdateStaffRole) => {
  const role = await StaffRole.findOne({ _id: roleId, hotelId, isTemplate: false });
  if (!role) throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  Object.assign(role, body);
  await role.save();
  await createAuditLog({
    hotelId,
    actorType: 'user',
    action: 'staff.role-updated',
    targetType: 'staff-role',
    targetId: String(role._id),
    summary: `Updated staff role ${role.name}.`,
  });
  return role;
};

export const deleteRole = async (hotelId: string, roleId: string) => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const inUse = await StaffMember.exists({ hotelId, roleId });
  if (inUse) throw new ApiError(httpStatus.CONFLICT, 'Role is assigned to one or more staff members');
  const deleted = await StaffRole.findOneAndDelete({ _id: roleId, hotelId, isTemplate: false });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  await createAuditLog({
    hotelId,
    actorType: 'user',
    action: 'staff.role-deleted',
    targetType: 'staff-role',
    targetId: roleId,
    summary: `Deleted a staff role.`,
  });
};

// ─── Members ─────────────────────────────────────────────────────────────────

const isPinTaken = async (hotelId: string, pin: string, excludeId?: string): Promise<boolean> => {
  // bcrypt comparison required — no plaintext PIN stored
  const members = await StaffMember.find({ hotelId, isActive: true }).select('+pin');
  // Sequential compare is intentional so we can short-circuit on the first match.
  for (const member of members) {
    if (excludeId && String(member._id) === excludeId) continue;
    if (await bcrypt.compare(pin, member.pin)) return true;
  }
  return false;
};

const isWeakPin = (pin: string) => {
  return ['0000', '1111', '1234', '4321'].includes(pin);
};

const assertPinStrength = async (hotelId: string, pin?: string) => {
  if (!pin) return;
  const hotel = await Hotel.findById(hotelId).select('settings.security.requireStrongPin');
  const requireStrongPin = (hotel as any)?.settings?.security?.requireStrongPin !== false;
  if (requireStrongPin && isWeakPin(pin)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a less predictable PIN');
  }
};

const assertRoleBelongsToHotel = async (hotelId: string, roleId: string) => {
  const role = await StaffRole.findOne({ _id: roleId, hotelId, isTemplate: false }).select('_id');
  if (!role) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role does not belong to this hotel');
  }
};

const assertGroupsBelongToHotel = async (hotelId: string, groupIds: mongoose.Types.ObjectId[] | string[] = []) => {
  if (!groupIds.length) {
    return;
  }

  const normalizedIds = groupIds.map((groupId) => String(groupId));
  const count = await NotificationGroup.countDocuments({ _id: { $in: normalizedIds }, hotelId });
  if (count !== normalizedIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more groups do not belong to this hotel');
  }
};

export const createMember = async (hotelId: string, createdBy: string, body: NewStaffMember) => {
  await assertPinStrength(hotelId, body.pin);
  await assertRoleBelongsToHotel(hotelId, String(body.roleId));
  await assertGroupsBelongToHotel(hotelId, body.groupIds);
  const taken = await isPinTaken(hotelId, body.pin);
  if (taken) throw new ApiError(httpStatus.CONFLICT, 'PIN is already in use by another staff member');
  const member = await StaffMember.create({ ...body, hotelId, createdBy, isActive: body.isActive ?? true });
  await createAuditLog({
    hotelId,
    actorType: 'user',
    actorId: createdBy,
    action: 'staff.member-created',
    targetType: 'staff-member',
    targetId: String(member._id),
    summary: `Created staff member ${member.name}.`,
  });
  return member;
};

export const getMembers = async (hotelId: string) => {
  return StaffMember.find({ hotelId }).populate('roleId', 'name permissions visibleModules').sort({ name: 1 });
};

export const updateMember = async (hotelId: string, memberId: string, body: UpdateStaffMember) => {
  const member = await StaffMember.findOne({ _id: memberId, hotelId }).select('+pin');
  if (!member) throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
  if (body.pin) {
    await assertPinStrength(hotelId, body.pin);
    const taken = await isPinTaken(hotelId, body.pin, memberId);
    if (taken) throw new ApiError(httpStatus.CONFLICT, 'PIN is already in use by another staff member');
  }
  if (body.roleId) {
    await assertRoleBelongsToHotel(hotelId, String(body.roleId));
  }
  if (body.groupIds) {
    await assertGroupsBelongToHotel(hotelId, body.groupIds);
  }
  Object.assign(member, body);
  await member.save();
  const updated = (await StaffMember.findById(memberId).populate(
    'roleId',
    'name permissions visibleModules'
  )) as any;
  if (!updated) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve updated member');
  await createAuditLog({
    hotelId,
    actorType: 'user',
    action: 'staff.member-updated',
    targetType: 'staff-member',
    targetId: memberId,
    summary: `Updated staff member ${updated.name}.`,
  });
  return updated;
};

export const deleteMember = async (hotelId: string, memberId: string) => {
  const deleted = (await StaffMember.findOneAndDelete({ _id: memberId, hotelId })) as any;
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found');
  await createAuditLog({
    hotelId,
    actorType: 'user',
    action: 'staff.member-deleted',
    targetType: 'staff-member',
    targetId: memberId,
    summary: `Deleted staff member ${deleted.name}.`,
  });
};

// ─── PIN Verification ────────────────────────────────────────────────────────

export const verifyPin = async (hotelId: string, pin: string): Promise<IStaffSessionPayload> => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(httpStatus.NOT_FOUND, 'Hotel not found');

  const members = await StaffMember.find({ hotelId, isActive: true })
    .select('+pin')
    .populate<{ roleId: { permissions: StaffPermission[]; visibleModules: string[] } }>(
      'roleId',
      'hotelId permissions visibleModules'
    );

  for (const member of members) {
    if (!(await bcrypt.compare(pin, member.pin))) continue;

    const role = member.roleId as any;
    if (!role || String((role as any).hotelId ?? '') !== String(hotelId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Staff member role is no longer valid for this hotel');
    }

    await assertGroupsBelongToHotel(hotelId, member.groupIds.map(String));
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
      { expiresIn: `${Math.max(1, Number((hotel as any)?.settings?.security?.pinSessionHours ?? 8))}h` }
    );

    await createAuditLog({
      hotelId,
      actorType: 'staff',
      actorId: String(member._id),
      action: 'staff.pin-login',
      targetType: 'staff-member',
      targetId: String(member._id),
      summary: `Staff PIN login for ${member.name}.`,
    });

    return {
      staffMemberId: String(member._id),
      name: member.name,
      permissions,
      groupIds: member.groupIds.map(String),
      visibleModules,
      token,
    };
  }

  await createAuditLog({
    hotelId,
    actorType: 'guest',
    action: 'staff.pin-login-failed',
    targetType: 'staff-auth',
    summary: 'Failed staff PIN login attempt.',
  });

  throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid PIN');
};
