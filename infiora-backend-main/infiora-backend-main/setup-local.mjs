import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const EMAIL = 'tudor@infiora.com';
const PASSWORD = 'admin123';
const DB_NAME = 'infiora-development';
const DASHBOARD_URL = 'http://localhost:4000';
const GUEST_APP_URL = 'http://localhost:4002';
const STABLE_ROOM_ID = new ObjectId('69cc0b91c6175610d7624d18');
const STABLE_ROOM_SLUG = 'soba-101-d7624d18';

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();

try {
  const db = client.db(DB_NAME);
  const now = new Date();

  let user = await db.collection('users').findOne({ email: EMAIL });

  if (!user) {
    const hashedPassword = await bcrypt.hash(PASSWORD, 8);
    user = {
      _id: new ObjectId(),
      name: 'Tudor',
      email: EMAIL,
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('users').insertOne(user);
    console.log('User kreiran:', EMAIL);
  } else {
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          role: 'admin',
          isEmailVerified: true,
          isActive: true,
          updatedAt: now,
        },
      }
    );
    user = await db.collection('users').findOne({ email: EMAIL });
    console.log('User vec postoji, updateovan na admin:', EMAIL);
  }

  const allUsers = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
  const knownUserIds = new Set(allUsers.map((entry) => String(entry._id)));
  const allHotels = await db.collection('hotels').find({}).sort({ createdAt: 1 }).toArray();
  const orphanHotels = allHotels.filter((entry) => entry.user && !knownUserIds.has(String(entry.user)));

  if (orphanHotels.length > 0) {
    const orphanHotelIds = orphanHotels.map((entry) => entry._id);
    await db.collection('hotels').updateMany(
      { _id: { $in: orphanHotelIds } },
      {
        $set: {
          user: user._id,
          manager: user._id,
          updatedAt: now,
        },
      }
    );
    console.log(`Prebaceno legacy hotela na ${EMAIL}: ${orphanHotels.length}`);
  }

  let hotel = await db.collection('hotels').findOne(
    { user: user._id, name: 'Hotel Test' },
    { sort: { createdAt: 1 } }
  );

  if (!hotel) {
    hotel = {
      _id: new ObjectId(),
      user: user._id,
      manager: user._id,
      name: 'Hotel Test',
      description: 'Lokalni testni hotel',
      isActive: true,
      socialLinks: [],
      orders: {
        enabled: true,
        availableFrom: '00:00',
        availableTo: '00:00',
        currencySymbol: 'EUR',
        processingLabel: 'Processing',
        onTheWayLabel: 'On the way',
        completedLabel: 'Completed',
      },
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('hotels').insertOne(hotel);
    console.log('Hotel kreiran: Hotel Test');
  } else {
    await db.collection('hotels').updateOne(
      { _id: hotel._id },
      {
        $set: {
          user: user._id,
          manager: user._id,
          updatedAt: now,
        },
      }
    );
    hotel = await db.collection('hotels').findOne({ _id: hotel._id });
    console.log('Hotel vec postoji:', hotel.name);
  }

  await db.collection('rooms').updateOne(
    { _id: STABLE_ROOM_ID },
    {
      $set: {
        hotel: hotel._id,
        name: 'Soba 101',
        number: '101',
        slug: STABLE_ROOM_SLUG,
        isActive: true,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
  console.log('Soba spremna: Soba 101');

  console.log('\n========================================');
  console.log(`Baza:    ${DB_NAME}`);
  console.log(`Admin:   ${DASHBOARD_URL}`);
  console.log(`Guest:   ${GUEST_APP_URL}/${STABLE_ROOM_ID.toString()}`);
  console.log('Email:   ', EMAIL);
  console.log('Lozinka: ', PASSWORD);
  console.log('Room ID: ', STABLE_ROOM_ID.toString());
  console.log('Slug:    ', STABLE_ROOM_SLUG);
  console.log('========================================');
} finally {
  await client.close();
}
