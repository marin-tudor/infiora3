import mongoose from 'mongoose';
// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker';
import Hotel from '../modules/hotel/hotel.model';
import { SeededUser } from './user.seeder';

export interface SeededHotel {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  manager?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  note?: string;
  activeUntil?: Date;
  socialLinks: string[];
  isActive: boolean;
}

const prefixes = ['Grand', 'Royal', 'The', 'Hotel', 'Resort', 'Inn', 'Boutique', 'Luxury'];
const suffixes = ['Palace', 'Plaza', 'Suites', 'Resort', 'Lodge', 'Inn', 'Hotel', 'Retreat'];

const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;

const generateHotelName = (): string => {
  const prefix = randomFromArray(prefixes);
  const city = faker.address.city();
  const suffix = randomFromArray(suffixes);
  return `${prefix} ${city} ${suffix}`;
};

const generateSocialLinks = (): string[] => {
  const links: string[] = [];
  const hotelName = faker.lorem.slug();

  if (faker.datatype.boolean()) {
    links.push(`https://facebook.com/${hotelName}`);
  }
  if (faker.datatype.boolean()) {
    links.push(`https://instagram.com/${hotelName}`);
  }
  if (faker.datatype.boolean()) {
    links.push(`https://twitter.com/${hotelName}`);
  }

  return links;
};

export const generateRandomHotels = (users: SeededUser[], count: number): SeededHotel[] => {
  const hotels: SeededHotel[] = [];
  const adminAndManagers = users.filter((u) => u.role === 'admin' || u.role === 'manager');
  const managers = users.filter((u) => u.role === 'manager');

  for (let i = 0; i < count; i += 1) {
    const owner = randomFromArray(adminAndManagers);
    const assignManager = faker.datatype.boolean() && managers.length > 0;

    const hotel: SeededHotel = {
      _id: new mongoose.Types.ObjectId(),
      user: owner._id,
      name: generateHotelName(),
      description: faker.lorem.paragraph(2),
      socialLinks: generateSocialLinks(),
      isActive: Math.random() > 0.25,
    };

    if (assignManager) {
      hotel.manager = randomFromArray(managers)._id;
    }

    if (faker.datatype.boolean()) {
      hotel.note = faker.lorem.sentence();
    }

    if (faker.datatype.boolean()) {
      hotel.activeUntil = faker.date.future(1);
    }

    hotels.push(hotel);
  }

  return hotels;
};

export const seedHotels = async (users: SeededUser[], hotelCount: number = 10): Promise<SeededHotel[]> => {
  const hotels = generateRandomHotels(users, hotelCount);
  await Hotel.insertMany(hotels);
  return hotels;
};

export const clearHotels = async (): Promise<void> => {
  await Hotel.deleteMany({});
};

export default {
  seedHotels,
  clearHotels,
  generateRandomHotels,
};
