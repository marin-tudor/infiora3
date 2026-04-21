import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const EMAIL = 'tudor@infiora.com';
const PASSWORD = 'admin123'; // lokalna lozinka za testiranje

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('infiora');

// Provjeri da li user vec postoji
let user = await db.collection('users').findOne({ email: EMAIL });

if (!user) {
  const hashedPassword = await bcrypt.hash(PASSWORD, 8);
  const userId = new ObjectId();
  await db.collection('users').insertOne({
    _id: userId,
    name: 'Tudor',
    email: EMAIL,
    password: hashedPassword,
    role: 'superAdmin',
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  user = await db.collection('users').findOne({ email: EMAIL });
  console.log('✓ User kreiran:', EMAIL);
} else {
  // Postavi ga na superAdmin ako vec postoji
  await db.collection('users').updateOne({ _id: user._id }, { $set: { role: 'superAdmin', isEmailVerified: true, isActive: true } });
  console.log('✓ User vec postoji, updateovan na superAdmin:', EMAIL);
}

// Provjeri da li vec ima hotel
const existingHotel = await db.collection('hotels').findOne({ user: user._id });
if (existingHotel) {
  console.log('✓ Hotel vec postoji:', existingHotel.name);
  console.log('\nMozete se prijaviti na http://localhost:3001');
  console.log('Email:', EMAIL);
  console.log('Lozinka:', PASSWORD, '(ako ste upravo kreirali usera) ili vasa stara lozinka');
  await client.close();
  process.exit(0);
}

// Kreiraj hotel
const hotelId = new ObjectId();
await db.collection('hotels').insertOne({
  _id: hotelId,
  user: user._id,
  name: 'Hotel Test',
  description: 'Lokalni testni hotel',
  isActive: true,
  socialLinks: [],
  orders: {
    enabled: true,
    availableFrom: '00:00',
    availableTo: '00:00',
    currencySymbol: '€',
    processingLabel: 'Processing',
    onTheWayLabel: 'On the way',
    completedLabel: 'Completed'
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
console.log('✓ Hotel kreiran: Hotel Test');

// Kreiraj sobu
const roomId = new ObjectId();
const slug = 'soba-101-' + roomId.toString().slice(-6);
await db.collection('rooms').insertOne({
  _id: roomId,
  hotel: hotelId,
  name: 'Soba 101',
  number: '101',
  slug,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
console.log('✓ Soba kreirana: Soba 101');

console.log('\n========================================');
console.log('Prijavite se na: http://localhost:3001');
console.log('Email:   ', EMAIL);
console.log('Lozinka: ', PASSWORD);
console.log('========================================');

await client.close();
