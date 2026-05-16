import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker';
import User from '../modules/user/user.model';

const salt = bcrypt.genSaltSync(8);

export interface SeededUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  language: string;
}

const defaultPassword = 'Password123';
const hashedPassword = bcrypt.hashSync(defaultPassword, salt);

export const adminUser: SeededUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Admin User',
  email: 'admin@infiora.com',
  password: hashedPassword,
  role: 'admin',
  isEmailVerified: true,
  isActive: true,
  language: 'en',
};

export const managerUser: SeededUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Manager User',
  email: 'manager@infiora.com',
  password: hashedPassword,
  role: 'manager',
  isEmailVerified: true,
  isActive: true,
  language: 'en',
};

const languages = ['en', 'de', 'fr', 'es'];

export const generateRandomUsers = (count: number): SeededUser[] => {
  const users: SeededUser[] = [];

  for (let i = 0; i < count; i += 1) {
    users.push({
      _id: new mongoose.Types.ObjectId(),
      name: faker.name.findName(),
      email: faker.internet.email().toLowerCase(),
      password: hashedPassword,
      role: 'user',
      isEmailVerified: faker.datatype.boolean(),
      isActive: true,
      language: languages[Math.floor(Math.random() * languages.length)] as string,
    });
  }

  return users;
};

export const seedUsers = async (randomUserCount: number = 5): Promise<SeededUser[]> => {
  const randomUsers = generateRandomUsers(randomUserCount);
  const allUsers = [adminUser, managerUser, ...randomUsers];

  const existingAdmin = await User.findOne({ email: adminUser.email });
  if (existingAdmin) {
    return allUsers;
  }

  await User.insertMany(allUsers);
  return allUsers;
};

export const clearUsers = async (): Promise<void> => {
  await User.deleteMany({});
};

export default {
  seedUsers,
  clearUsers,
  adminUser,
  managerUser,
  generateRandomUsers,
  defaultPassword,
};
