import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('infiora');

const user = await db.collection('users').findOne({ email: 'tudor@infiora.com' });
if (!user) { console.error('User not found!'); process.exit(1); }

await db.collection('users').updateOne({ _id: user._id }, { $set: { role: 'admin' } });
console.log('✓ User -> admin');

const hotelId = new ObjectId();
await db.collection('hotels').insertOne({
  _id: hotelId, user: user._id, name: 'Hotel Test',
  description: 'Testni hotel', isActive: true, socialLinks: [],
  orders: { enabled: true, availableFrom: '00:00', availableTo: '00:00',
    currencySymbol: '€', processingLabel: 'Processing',
    onTheWayLabel: 'On the way', completedLabel: 'Completed' },
  createdAt: new Date(), updatedAt: new Date()
});
console.log('✓ Hotel:', hotelId.toString());

const roomId = new ObjectId();
const slug = 'soba-101-' + roomId.toString().slice(-6);
await db.collection('rooms').insertOne({
  _id: roomId, hotel: hotelId, name: 'Soba 101', number: '101',
  slug, isActive: true, createdAt: new Date(), updatedAt: new Date()
});
console.log('✓ Soba, slug:', slug);

await db.collection('reservationcodes').insertOne({
  _id: new ObjectId(), hotelId, roomId, roomNumber: '101',
  code: 'GOST2025', guestName: 'Tudor Test',
  checkIn: new Date(), checkOut: new Date(Date.now() + 7*24*60*60*1000),
  active: true, createdBy: user._id, createdAt: new Date(), updatedAt: new Date()
});
console.log('✓ Reservation code: GOST2025');

const catId = new ObjectId();
await db.collection('ordercategories').insertOne({
  _id: catId, hotelId, name: 'Hrana i piće', icon: '🍔',
  sortOrder: 0, active: true, createdAt: new Date(), updatedAt: new Date()
});

await db.collection('catalogitems').insertOne({
  _id: new ObjectId(), hotelId, categoryId: catId,
  name: 'Pizza Margherita', description: 'Klasična pizza',
  price: 12.50, discount: 0, imageType: 'emoji', image: '🍕',
  tags: [], badge: '', available: true, sortOrder: 0, modifiers: [],
  createdAt: new Date(), updatedAt: new Date()
});
console.log('✓ Kategorija + item kreiran');

console.log('\n========================================');
console.log('Dashboard: http://localhost:3001/en');
console.log('Guest order: http://localhost:3000/r/' + slug + '/order');
console.log('Reservation code: GOST2025');
console.log('========================================');

await client.close();
