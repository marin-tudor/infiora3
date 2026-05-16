export interface GenericResponse {
  status: string;
  message: string;
}

export interface GenericResultResponse<T> {
  status: string;
  results: T[];
  page: number;
  limit: number;
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}
export interface IBatch {
  id: string;
  name?: string;
  description?: string;
}
export interface ITag {
  id: string;
  title?: string;
  headline?: string;
  image?: string;
  type?: string;
}

export interface ITicket {
  id: string;
  user: string;
  category?: string;
  subject: string;
  message: string;
  status?: string;
}
export interface IHotel {
  id: string;
  user: string;
  name?: string;
  description?: string;
  socialLinks?: string[];
  image?: string;
  cover?: string;
  isActive?: boolean;
  activeUntil?: string;
  settings?: {
    offlineGuideEnabled?: boolean;
    translationSourceLanguage?: string;
    translationCacheLanguages?: string[];
  };
  features?: {
    ordersEnabled?: boolean;
    maintenanceEnabled?: boolean;
    housekeepingEnabled?: boolean;
  };
  map?: IHotelMapSettings;
  mapPoints?: IMapPoint[];
}

export type MapMarkerIcon =
  | "hotel"
  | "food"
  | "drink"
  | "beach"
  | "pool"
  | "spa"
  | "taxi"
  | "parking"
  | "activity"
  | "shopping"
  | "info"
  | "viewpoint"
  | "transport"
  | "coffee"
  | "custom";

export interface IMapCustomPreset {
  id: string;
  name: string;
  icon: string;
  color?: string;
  text?: string;
}

export interface IMapPoint {
  id?: string;
  title: string;
  description?: string;
  image?: string;
  address?: string;
  lat: number;
  lng: number;
  color?: string;
  icon?: MapMarkerIcon;
  customPresetId?: string;
  customIconClass?: string;
  customIconImage?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface IHotelMapSettings {
  enabled?: boolean;
  defaultState?: "collapsed" | "expanded";
  centerAddress?: string;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  showHotelMarker?: boolean;
  customPresets?: IMapCustomPreset[];
}

export interface IFeedback {
  isActive?: boolean;
  emailRequirement?: "none" | "optional" | "mandatory";
  textRequirement?: "none" | "optional" | "mandatory";
  emails?: string[];
  googleMapsLink?: string;
}

export interface ISurveyQuestion {
  id: string;
  type: 'rating' | 'yes_no' | 'single_choice' | 'multi_choice' | 'open_text' | 'nps' | 'matrix' | 'contact';
  text: string;
  options?: string[];
  matrixRows?: string[];
  matrixColumns?: string[];
  required?: boolean;
}

export interface ISurvey {
  isActive?: boolean;
  type?: 'popup' | 'button';
  buttonText?: string;
  mainButtonText?: string;
  imageType?: 'none' | 'image' | 'icon' | 'url';
  image?: string;
  questions?: ISurveyQuestion[];
}

export interface IRoom {
  id: string;
  hotel: IHotel;
  sourceLanguage?: string;
  translationLanguage?: string;
  requestedTranslationLanguage?: string;
  availableTranslationLanguages?: string[];
  translationCacheHit?: boolean;
  group?: IGroup;
  isActive?: boolean;
  kioskMode?: boolean;
  number: string;
  description?: string;
  orderedLinks?: string[];
  background?: {
    color?: string;
    direction?: "up" | "down";
    type?: string; // 'solid' | 'gradient' | 'image'
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
    variant?: "outlined" | "contained";
    borderRadius?: string;
  };
  popup?: {
    message?: string;
    buttonText?: string;
    link?: string;
    backgroundColor?: string;
    fontColor?: string;
    imageType?: "none" | "image" | "icon" | "url";
    image?: string;
    isActive?: boolean;
    size?: "small" | "medium" | "fullscreen";
    position?: "top" | "center" | "bottom";
  };
  newsletter?: {
    message?: string;
    successMessage?: string;
    buttonText?: string;
    mainButtonText?: string;
    type?: string;
    color?: string;
    image?: string;
    imageType?: "none" | "image" | "icon" | "url";
    isActive?: boolean;
  };
  feedback?: IFeedback;
  survey?: ISurvey;
  housekeeping?: { isActive?: boolean; mainButtonText?: string; icon?: string; emails?: string[]; askRoomNumber?: boolean; roomNumberLabel?: string; askReservationCode?: boolean; reservationCodeLabel?: string; options?: { key?: string; label?: string; icon?: string }[] };
  maintenance?: { isActive?: boolean; mainButtonText?: string; icon?: string; emails?: string[]; askRoomNumber?: boolean; roomNumberLabel?: string; askReservationCode?: boolean; reservationCodeLabel?: string; options?: { key?: string; label?: string }[] };
}

export interface IGroup {
  id: string;
  title: string;
  hotel: string;
  description?: string;
  housekeeping?: { isActive?: boolean; mainButtonText?: string; icon?: string; emails?: string[]; askRoomNumber?: boolean; roomNumberLabel?: string; askReservationCode?: boolean; reservationCodeLabel?: string; options?: { key?: string; label?: string; icon?: string }[] };
  maintenance?: { isActive?: boolean; mainButtonText?: string; icon?: string; emails?: string[]; askRoomNumber?: boolean; roomNumberLabel?: string; askReservationCode?: boolean; reservationCodeLabel?: string; options?: { key?: string; label?: string }[] };
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
    variant?: "outlined" | "contained";
    borderRadius?: string;
  };
  popup?: {
    message?: string;
    buttonText?: string;
    link?: string;
    backgroundColor?: string;
    fontColor?: string;
    image?: string;
    isActive?: string;
    size?: "small" | "medium" | "fullscreen";
    position?: "top" | "center" | "bottom";
  };
  newsletter?: {
    message?: string;
    successMessage?: string;
    buttonText?: string;
    mainButtonText?: string;
    type?: string;
    color?: string;
    image?: string;
    imageType?: "none" | "image" | "icon" | "url";
    isActive?: string;
  };
  feedback?: IFeedback;
  survey?: ISurvey;
}

export interface ILink {
  id: string;
  position: number;
  room?: string;
  group?: string;
  title?: string;
  value: string;
  type: string;
  items: IItem[];
  sections: ISection[];
  image?: string;
  imageType?: "none" | "image" | "icon" | "url";
  isActive: boolean;
  data: any;
}

export interface IItem {
  id: string;
  title: string;
  value: string;
  type: string;
  data: any;
}

export interface ISection {
  id: string;
  title: string;
  description?: string;
  url?: string;
  urlButtonText?: string;
  links?: { url: string; urlButtonText: string }[];
  phone?: string;
  address?: string;
  images?: string[];
  video?: string;
  items?: any;
  mapEnabled?: boolean;
  mapTitle?: string;
  mapDescription?: string;
  mapImage?: string;
  mapLat?: number;
  mapLng?: number;
  mapColor?: string;
  mapIcon?: MapMarkerIcon;
  linkedMapPointId?: string;
}

export interface ILanguage {
  code: string;
  name: string;
  flag: string;
}
