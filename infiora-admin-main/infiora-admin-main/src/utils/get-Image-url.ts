import { BASE_URL } from '@/configs/constants';
import { isNullOrEmpty } from './helpers';

/**
 * Gets the URL of a user image.
 * @param {Object} user - The user object.
 * @returns {string} The URL of the user image.
 */
export const getUserImageUrl = (user: any) => {
  if (user && !isNullOrEmpty(user.image)) {
    return user.image;
  } else {
    return '/assets/avatars/avatar-anika-visser.png';
  }
};

export const getImageUrl = (image?: string) => {
  if (!isNullOrEmpty(image)) {
    return image;
  }

  return null;
};
