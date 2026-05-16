Invoke-RestMethod -Method POST -Uri "http://localhost:8080/v1/auth/register" -ContentType "application/json" -Body '{"name": "Tudor", "email": "tudor@infiora.com", "password": "Test1234!"}'
Write-Host "Done! Press any key..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
