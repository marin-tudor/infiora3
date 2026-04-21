import { isNullOrEmpty } from './miscUtils';

export const getRoomImageUrl = (room: any) => {
  if (room && !isNullOrEmpty(room.image)) {
    return room.image;
  }

  return '/images/placeholders/link.png';
};

export const getHotelImageUrl = (hotel: any) => {
  if (hotel && !isNullOrEmpty(hotel.image)) {
    return hotel.image;
  }

  return '/images/placeholders/link.png';
};

export const getLinkImageUrl = (link: any) => {
  if (link && !isNullOrEmpty(link.image)) {
    return link.image;
  }

  return '/images/placeholders/link.png';
};
