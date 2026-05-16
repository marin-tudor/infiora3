import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';
import { Hotel } from '../hotel';
import NotificationGroup from './notification-group.model';
import DispatchRule from './dispatch-rule.model';
import {
  DispatchEventType,
  IRouteResult,
  NewDispatchRule,
  NewNotificationGroup,
  UpdateDispatchRule,
  UpdateNotificationGroup,
} from './dispatch.interfaces';

type PopulatedDispatchGroup = {
  _id: unknown;
  sseEnabled?: boolean;
  emailAddresses?: string[];
};

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
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const inUse = await DispatchRule.exists({ hotelId, targetGroupId: groupId });
  if (inUse) throw new ApiError(httpStatus.CONFLICT, 'Group is referenced by one or more dispatch rules');

  const deleted = await NotificationGroup.findOneAndDelete({ _id: groupId, hotelId });
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, 'Notification group not found');
};

export const createRule = async (hotelId: string, body: NewDispatchRule) => {
  const group = await NotificationGroup.findOne({ _id: body.targetGroupId, hotelId });
  if (!group) throw new ApiError(httpStatus.NOT_FOUND, 'Target notification group not found');

  return DispatchRule.create({ ...body, hotelId, active: body.active ?? true });
};

export const getRules = async (hotelId: string) => {
  return DispatchRule.find({ hotelId }).populate('targetGroupId', 'name sseEnabled emailAddresses').sort({ priority: 1 });
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

export const route = async (
  hotelId: string,
  eventType: DispatchEventType,
  categoryId?: string,
  itemId?: string
): Promise<IRouteResult> => {
  const rules = await DispatchRule.find({ hotelId, active: true })
    .populate('targetGroupId', 'sseEnabled emailAddresses')
    .sort({ priority: 1 });

  for (const rule of rules) {
    const { conditions } = rule;

    if (!conditions.eventTypes.includes(eventType)) continue;

    if (itemId && conditions.itemIds.length > 0 && !conditions.itemIds.map(String).includes(itemId)) {
      continue;
    }

    if (categoryId && conditions.categoryIds.length > 0 && !conditions.categoryIds.map(String).includes(categoryId)) {
      continue;
    }

    const group = rule.targetGroupId as unknown as PopulatedDispatchGroup;
    return {
      groupId: String(group._id),
      groupEmails: group.emailAddresses ?? [],
      escalationSeconds: rule.escalationSeconds,
      sseEnabled: group.sseEnabled ?? false,
    };
  }

  const hotel = await Hotel.findById(hotelId).select('orders.emails');
  return {
    groupId: null,
    groupEmails: (hotel as any)?.orders?.emails ?? [],
    escalationSeconds: 30,
    sseEnabled: false,
  };
};
