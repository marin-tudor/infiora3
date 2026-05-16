import { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { IHotelDoc } from '../hotel/hotel.interfaces';
import { ISurvey } from '../room/room.interfaces';

interface IPopup {
  message?: string;
  buttonText?: string;
  link?: string;
  backgroundColor?: string;
  fontColor?: string;
  size?: string;
  position?: string;
  image?: string;
  imageType?: 'none' | 'image' | 'icon' | 'url';
  isActive?: boolean;
}
interface INewsletter {
  message?: string;
  successMessage?: string;
  buttonText?: string;
  mainButtonText?: string;
  type?: string;
  color?: string;
  image?: string;
  imageType?: 'none' | 'image' | 'icon' | 'url';
  isActive?: boolean;
}

interface IFeedback {
  isActive?: boolean;
  emailRequirement?: 'none' | 'optional' | 'mandatory';
  textRequirement?: 'none' | 'optional' | 'mandatory';
  emails?: string[];
  googleMapsLink?: string;
}

export interface IGroup {
  hotel: IHotelDoc;
  title?: string;
  description?: string;
  background?: {
    color?: string;
    direction?: string;
    type?: string;
    image?: string;
    imageOpacity?: number;
    backgroundFit?: string;
    backgroundPosition?: string;
    tileSize?: number;
  };
  font?: {
    color?: string;
    family?: string;
  };
  button?: {
    color?: string;
    backgroundColor?: string;
    variant?: string;
    borderRadius?: string;
  };
  popup?: IPopup;
  newsletter?: INewsletter;
  feedback?: IFeedback;
  survey?: ISurvey;
  housekeeping?: {
    isActive?: boolean;
    mainButtonText?: string;
    icon?: string;
    emails?: string[];
    askRoomNumber?: boolean;
    roomNumberLabel?: string;
    askReservationCode?: boolean;
    reservationCodeLabel?: string;
    options?: { key?: string; label?: string; icon?: string }[];
  };
  maintenance?: {
    isActive?: boolean;
    mainButtonText?: string;
    icon?: string;
    emails?: string[];
    askRoomNumber?: boolean;
    roomNumberLabel?: string;
    askReservationCode?: boolean;
    reservationCodeLabel?: string;
    options?: { key?: string; label?: string }[];
  };
  isActive?: boolean;
}

export interface IGroupDoc extends IGroup, Document {}

export interface IGroupModel extends Model<IGroupDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateGroupBody = Partial<IGroup>;

export type NewCreatedGroup = Omit<IGroup, 'isActive'>;

export const groupPopulate = [
  {
    path: 'hotel',
  },
];
