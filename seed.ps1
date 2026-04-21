# 1. Postavi usera na admin role
$mongo = "C:\Program Files\MongoDB\Server\8.0\bin\mongosh.exe"
& $mongo "mongodb://localhost:27017/infiora" --eval 'db.users.updateOne({email:"tudor@infiora.com"},{$set:{role:"admin"}})'

# 2. Login i dohvati token
$login = Invoke-RestMethod -Method POST -Uri "http://localhost:8000/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"tudor@infiora.com","password":"Test1234!"}'

$token = $login.tokens.access.token
Write-Host "Token: $token"

# 3. Kreiraj hotel
$hotel = Invoke-RestMethod -Method POST -Uri "http://localhost:8000/v1/hotels" `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"name":"Hotel Test","slug":"hotel-test","description":"Test hotel za razvoj","address":"Testna ulica 1, Zagreb"}'

$hotelId = $hotel._id
Write-Host "Hotel ID: $hotelId"

# 4. Kreiraj sobu
$room = Invoke-RestMethod -Method POST -Uri "http://localhost:8000/v1/rooms" `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body "{`"hotelId`":`"$hotelId`",`"name`":`"Soba 101`",`"number`":`"101`"}"

$roomId = $room._id
$roomSlug = $room.slug
Write-Host "Room ID: $roomId, Slug: $roomSlug"

# 5. Kreiraj reservation code
$checkIn = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$checkOut = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$code = Invoke-RestMethod -Method POST -Uri "http://localhost:8000/v1/orders/hotels/$hotelId/codes" `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body "{`"roomId`":`"$roomId`",`"roomNumber`":`"101`",`"code`":`"GOST2025`",`"guestName`":`"Tudor Test`",`"checkIn`":`"$checkIn`",`"checkOut`":`"$checkOut`"}"

Write-Host "Reservation Code: $($code.code)"

# 6. Kreiraj order kategoriju
$cat = Invoke-RestMethod -Method POST -Uri "http://localhost:8000/v1/orders/hotels/$hotelId/categories" `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"name":"Hrana i pice","icon":"🍔","active":true}'

$catId = $cat._id
Write-Host "Category ID: $catId"

# 7. Kreiraj catalog item
$item = Invoke-RestMethod -Method POST -Uri "http://localhost:8000/v1/orders/hotels/$hotelId/items" `
  -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body "{`"categoryId`":`"$catId`",`"name`":`"Pizza Margherita`",`"description`":`"Klasicna pizza`",`"price`":12.50,`"discount`":0,`"imageType`":`"emoji`",`"image`":`"🍕`",`"tags`":[],`"badge`":`"`",`"available`":true,`"modifiers`":[]}"

Write-Host "Item: $($item.name)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SVE KREIRANO!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:3001/en" -ForegroundColor Cyan
Write-Host "Guest order page: http://localhost:3000/r/$roomSlug/order" -ForegroundColor Cyan
Write-Host "Reservation code za testiranje: GOST2025" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
