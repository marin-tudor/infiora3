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
}

export interface IFeedback {
  isActive?: boolean;
  emailRequirement?: "none" | "optional" | "mandatory";
  textRequirement?: "none" | "optional" | "mandatory";
  emails?: string[];
  googleMapsLink?: string;
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
    direction?: "up" | "down";
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
  phone?: string;
  address?: string;
  images?: string[];
  video?: string;
  items?: any;
}

export interface ILanguage {
  code: string;
  name: string;
  flag: string;
}
