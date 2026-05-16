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

export const DISPATCH_EVENT_TYPES = ['order', 'booking', 'housekeeping', 'maintenance'] as const;
export type DispatchEventType = typeof DISPATCH_EVENT_TYPES[number];

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
export type NewDispatchRule = Pick<
  IDispatchRule,
  'name' | 'priority' | 'conditions' | 'targetGroupId' | 'escalationSeconds'
> & {
  active?: boolean;
};
export type UpdateDispatchRule = Partial<
  Pick<IDispatchRule, 'name' | 'priority' | 'conditions' | 'targetGroupId' | 'escalationSeconds' | 'active'>
>;

export interface IRouteResult {
  groupId: string | null;
  groupEmails: string[];
  escalationSeconds: number;
  sseEnabled: boolean;
}
