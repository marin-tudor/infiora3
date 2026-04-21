// Pokreni: mongosh mongodb://localhost:27017/infiora seed-mongo.js

const userId = db.users.findOne({email: "tudor@infiora.com"})?._id;
if (!userId) { print("ERROR: User tudor@infiora.com not found!"); quit(1); }

// Admin role
db.users.updateOne({_id: userId}, {$set: {role: "admin"}});
print("✓ User set to admin");

// Kreiraj hotel
const hotelId = new ObjectId();
db.hotels.insertOne({
  _id: hotelId,
  user: userId,
  name: "Hotel Test",
  description: "Testni hotel za razvoj",
  isActive: true,
  socialLinks: [],
  orders: {
    enabled: true,
    availableFrom: "00:00",
    availableTo: "00:00",
    currencySymbol: "€",
    processingLabel: "Processing",
    onTheWayLabel: "On the way",
    completedLabel: "Completed"
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✓ Hotel kreiran: " + hotelId);

// Kreiraj sobu
const roomId = new ObjectId();
db.rooms.insertOne({
  _id: roomId,
  hotel: hotelId,
  name: "Soba 101",
  number: "101",
  slug: "soba-101-" + roomId.toString().slice(-6),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
const roomSlug = db.rooms.findOne({_id: roomId}).slug;
print("✓ Soba kreirana: " + roomId + " (slug: " + roomSlug + ")");

// Reservation code
const codeId = new ObjectId();
db.reservationcodes.insertOne({
  _id: codeId,
  hotelId: hotelId,
  roomId: roomId,
  roomNumber: "101",
  code: "GOST2025",
  guestName: "Tudor Test",
  checkIn: new Date(),
  checkOut: new Date(Date.now() + 7*24*60*60*1000),
  active: true,
  createdBy: userId,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✓ Reservation code: GOST2025");

// Order kategorija
const catId = new ObjectId();
db.ordercategories.insertOne({
  _id: catId,
  hotelId: hotelId,
  name: "Hrana i piće",
  icon: "🍔",
  sortOrder: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✓ Kategorija kreirana");

// Catalog item
db.catalogitems.insertOne({
  _id: new ObjectId(),
  hotelId: hotelId,
  categoryId: catId,
  name: "Pizza Margherita",
  description: "Klasična pizza s rajčicom i mozzarellom",
  price: 12.50,
  discount: 0,
  imageType: "emoji",
  image: "🍕",
  tags: [],
  badge: "",
  available: true,
  sortOrder: 0,
  modifiers: [],
  createdAt: new Date(),
  updatedAt: new Date()
});
print("✓ Catalog item kreiran");

print("");
print("========================================");
print("SVE KREIRANO!");
print("Dashboard: http://localhost:3001/en");
print("Guest order: http://localhost:3000/r/" + roomSlug + "/order");
print("Reservation code: GOST2025");
print("========================================");
