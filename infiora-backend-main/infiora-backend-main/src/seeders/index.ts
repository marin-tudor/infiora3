import mongoose from 'mongoose';
import config from '../config/config';
import { seedUsers, clearUsers } from './user.seeder';
import { seedHotels, clearHotels } from './hotel.seeder';

const runSeeders = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoose.url);

    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear') || args.includes('-c');
    const usersOnly = args.includes('--users');
    const hotelsOnly = args.includes('--hotels');

    const userCountArg = args.find((arg) => arg.startsWith('--user-count='));
    const hotelCountArg = args.find((arg) => arg.startsWith('--hotel-count='));
    const userCount = userCountArg ? parseInt(userCountArg.split('=')[1] || '5', 10) : 5;
    const hotelCount = hotelCountArg ? parseInt(hotelCountArg.split('=')[1] || '10', 10) : 10;

    if (shouldClear) {
      if (!usersOnly) await clearHotels();
      if (!hotelsOnly) await clearUsers();
    }

    let users;

    if (!hotelsOnly) {
      users = await seedUsers(userCount);
    }

    if (!usersOnly) {
      if (!users) {
        const User = (await import('../modules/user/user.model')).default;
        const existingUsers = await User.find({});
        users = existingUsers.map((u) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          password: '',
          role: u.role,
          isEmailVerified: u.isEmailVerified,
          isActive: u.isActive ?? true,
          language: u.language ?? 'en',
        }));
      }

      if (users && users.length > 0) {
        await seedHotels(users, hotelCount);
      }
    }
  } catch (error) {
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.exit(0);
}

runSeeders();
