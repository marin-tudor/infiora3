import { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { HotelMapMarkerIcon } from '../hotel/hotel.interfaces';

export interface IItem {
  id: string;
  title: string;
  value: string;
  type: string;
  data?: any;
}
export interface ISection {
  id: string;
  title: string;
  description?: string;
  url?: string;
  urlButtonText?: string;
  phone?: string;
  address?: string;
  images?: string[];
  video?: string;
  mapEnabled?: boolean;
  mapTitle?: string;
  mapDescription?: string;
  mapImage?: string;
  mapLat?: number;
  mapLng?: number;
  mapColor?: string;
  mapIcon?: HotelMapMarkerIcon;
  linkedMapPointId?: string;
}

interface IBaseLink {
  title?: string;
  value: string;
  type: string;
  items?: IItem[];
  sections?: ISection[];
  image?: string;
  imageType?: 'image' | 'icon' | 'url';
  isActive: boolean;
  data?: any;
}

export interface ILink extends IBaseLink {
  room?: string;
  group?: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILinkDoc extends ILink, Document {}

export interface ILinkModel extends Model<ILinkDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateLinkBody = Partial<IBaseLink>;

export type NewCreatedLink = Omit<ILink, 'position' | 'isActive' | 'createdAt' | 'updatedAt'>;
