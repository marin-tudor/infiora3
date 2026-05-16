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
  note?: string;
  manager?: string;
  socialLinks?: string[];
  image: string;
  isActive: boolean;
  features?: {
    ordersEnabled?: boolean;
    maintenanceEnabled?: boolean;
    housekeepingEnabled?: boolean;
    staffRbacEnabled?: boolean;
    smartDispatchingEnabled?: boolean;
    bookableServicesEnabled?: boolean;
  };
  map?: IHotelMapSettings;
  mapPoints?: IMapPoint[];
  stripeAccountId?: string | null;
  stripeAccountStatus?: 'not_connected' | 'pending' | 'active' | 'restricted';
  stripePlatformFeePercent?: number | null;
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

export interface IRoom {
  id: string;
  hotel: IHotel;
  group?: IGroup;
  isActive?: boolean;
  kioskMode?: boolean;
  number: string;
  description?: string;
  orderedLinks?: string[];
  background?: {
    color?: string;
    direction?: string;
    type?: string;
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
}

export interface IGroup {
  id: string;
  title: string;
  hotel: string;
  description?: string;
  background?: {
    color?: string;
    direction?: string;
    type?: string;
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

export interface IActivity {
  id: string;
  user: string;
  action: "tap" | "view";
  details: {
    ip?: string;
    image: string;
    title: string;
    headline: string;
    link?: string;
    room?: string;
    hotel?: string;
    time?: number;
    device?: string;
    engaged?: boolean;
    language?: string;
    socialLink?: string;
    button?: string;
    buttonTitle?: string;
    source?: string;
    destination?: string;
  };
  createdAt: string;
}

export interface IInsights {
  overTime: Record<
    | "taps"
    | "views"
    | "liveViews"
    | "uniqueViews"
    | "timeSpent"
    | "bounceRate"
    | "engagedViews",
    Record<string, number>
  >;
  change: Record<
    | "taps"
    | "views"
    | "liveViews"
    | "uniqueViews"
    | "timeSpent"
    | "bounceRate"
    | "engagedViews",
    number
  >;
  keyMetrics: {
    topPerforming: { room: string; link: string };
    viewsByLanguages: Record<string, number>;
    viewsByDevices: Record<string, number>;
    views: number;
    liveViews: number;
    taps: number;
    uniqueViews: number;
    timeSpent: number;
    bounceRate: number;
  };
  hotels: (IHotel & {
    views: number;
    redirects: number;
    checkinOpens?: number;
    checkinLastUsedAt?: string | null;
  })[];
  rooms: (IRoom & {
    views: number;
    taps: number;
    topPerformingLink: string;
    uniqueViews: number;
    timeSpent: number;
    bounceRate: string;
  })[];
  links: (ILink & {
    taps: number;
  })[];
  activities: IActivity[];
  topRoom: IRoom & {
    views: number;
    taps: number;
    topPerformingLink: string;
    uniqueViews: number;
    timeSpent: number;
    bounceRate: string;
  };
  topLink: ILink & {
    taps: number;
  };
  checkinUsage?: {
    opens: number;
    uniqueHotels: number;
    lastUsedAt?: string | null;
  };
}
