import { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
import { IHotelDoc } from '../hotel/hotel.interfaces';

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

export interface ISurveyQuestion {
  id: string;
  type: 'rating' | 'yes_no' | 'single_choice' | 'multi_choice' | 'open_text' | 'nps' | 'matrix' | 'contact';
  text: string;
  options?: string[]; // za single_choice, multi_choice
  matrixRows?: string[]; // redovi za matrix pitanje
  matrixColumns?: string[]; // kolone za matrix pitanje
  required?: boolean;
}

export interface ISurvey {
  isActive?: boolean;
  type?: 'popup' | 'button';
  buttonText?: string; // tekst u popup modu
  mainButtonText?: string; // tekst gumba u button modu
  imageType?: 'none' | 'image' | 'icon' | 'url';
  image?: string;
  questions?: ISurveyQuestion[];
}

export interface IRoom {
  hotel: IHotelDoc;
  url?: string;
  number?: string;
  description?: string;
  isActive?: boolean;
  kioskMode?: boolean;
  group?: any;
  orderedLinks?: string[];
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
}

export interface IRoomDoc extends IRoom, Document {}

export interface IRoomModel extends Model<IRoomDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type UpdateRoomBody = Partial<IRoom>;

export type NewCreatedRoom = { hotel: string; quantity: number; start: number; suffix: string; prefix: string };

export interface IGuestRoomListItem {
  id: string;
  url?: string;
  number?: string;
  description?: string;
  kioskMode?: boolean;
  hotel: {
    id: string;
    name: string;
    image?: string;
    cover?: string;
    isActive: boolean;
    orders?: {
      enabled: boolean;
      paymentMethods: {
        cash: boolean;
        card: boolean;
        online: boolean;
      };
    };
    bookings?: {
      enabled: boolean;
    };
    features?: {
      ordersEnabled: boolean;
      maintenanceEnabled: boolean;
      housekeepingEnabled: boolean;
    };
  };
}

export const roomPopulate = [
  {
    path: 'hotel',
  },
  {
    path: 'group',
  },
];
