# Infiora Full Deep Scan Audit

Ovaj fajl je radni audit sazetak za cijeli `infiora` workspace. Namjena mu je:

- da imamo jedno mjesto s nalazima
- da prvo pregledamo i potvrdimo prioritete
- da tek nakon toga krenemo u odvojene code changes

Napomena:
- ovo je duboki staticki pregled glavnih aplikacija i konfiguracija
- nije formalni penetration test
- nije moguce doslovno dokazati "svaki line" bez visednevnog rucnog prolaza i runtime/integration testova, ali ovo pokriva najrizicnije auth, config i access-control tocke koje sam nasao

## Audit Scope

Pregledani glavni dijelovi:

- `infiora-dash-main`
- `infiora-admin-main`
- `infiora-backend-main`
- `infiora-api-main`
- `infiora-django-main`
- root/local setup skripte

## Priority 0: First Fixes Before Feature Work

### 1. Dashboard `NextAuth` credentials provider vjeruje klijentu bez provjere

Fajl:
- [src/libs/auth.ts](/c:/Users/Tudor/infiora/infiora-dash-main/infiora-dash-main/src/libs/auth.ts)

Problem:
- `authorize(user: any) { return user }`
- bilo koji payload koji dode do credentials callbacka moze postati session

Rizik:
- auth bypass
- forged session payload

Sto promijeniti:
- `authorize` mora validirati credentials protiv stvarnog backend auth endpointa ili server-side session izvora
- ne smije samo vratiti klijentski payload
- session i jwt callbackovi trebaju primati samo server-verified user shape

### 2. Dashboard i dalje sadrzi demo login API s hard-coded passwordom

Fajlovi:
- [src/app/api/login/route.ts](/c:/Users/Tudor/infiora/infiora-dash-main/infiora-dash-main/src/app/api/login/route.ts)
- [src/app/api/login/users.ts](/c:/Users/Tudor/infiora/infiora-dash-main/infiora-dash-main/src/app/api/login/users.ts)

Problem:
- local/demo route radi plaintext usporedbu passworda
- postoji hard-coded user i hard-coded password `admin`

Rizik:
- accidental exposure
- zbunjen auth flow
- lako ostane u kodu i kasnije se nehotice koristi

Sto promijeniti:
- maknuti cijeli demo login route iz produkcijskog appa
- ako treba ostati za development, staviti ga iza explicitnog dev-only feature flaga i izoliranog foldera

### 3. Backend local setup skripta pise invalid role `superAdmin`

Fajlovi:
- [setup-local.mjs](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/setup-local.mjs)
- [src/config/roles.ts](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/src/config/roles.ts)
- [src/modules/user/user.model.ts](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/src/modules/user/user.model.ts)

Problem:
- skripta insert/update-a `role: 'superAdmin'`
- schema dopušta samo `user`, `admin`, `manager`

Rizik:
- lokalni auth i permissions drift
- korisnici zavrse u stanju koje app ne ocekuje

Sto promijeniti:
- zamijeniti `superAdmin` s jednim od stvarno podrzanih roleova
- proci sve seed/setup skripte i izbaciti nepodudarne role vrijednosti

### 4. Admin guard ne guard-a stvarno

Fajlovi:
- [src/components/AuthGuard.tsx](/c:/Users/Tudor/infiora/infiora-admin-main/infiora-admin-main/src/components/AuthGuard.tsx)
- [src/pages/_app.tsx](/c:/Users/Tudor/infiora/infiora-admin-main/infiora-admin-main/src/pages/_app.tsx)

Problem:
- `AuthGuard` samo ceka da `getMe` prestane biti loading
- nakon toga uvijek rendera children
- `AuthRedirect` je importan, ali se ne koristi

Rizik:
- privid zastite bez stvarne zastite
- protected UI moze biti dostupan i kad user nije autentificiran

Sto promijeniti:
- guard mora eksplicitno razlikovati:
  - loading
  - authenticated
  - unauthenticated
- za unauthenticated stanje mora redirectati na login

## Priority 1: Security Hardening

### 5. Dodati anti-bruteforce / anti-spam na login, forgot-password i reset-password

Projekti:
- `infiora-backend-main`
- po potrebi `infiora-api-main`
- po potrebi `infiora-django-main`

Problem:
- trenutno nema jasnog local/application-level throttling plana za:
  - login attempts
  - password reset request spam
  - refresh token abuse

Preporuka:
- login rate limit po IP + po emailu
- forgot-password rate limit po IP + po emailu
- lockout / cooldown nakon vise neuspjelih pokusaja
- audit log za repeated failed logins
- po potrebi captcha tek nakon thresholda, ne odmah svima

Minimalni plan:
- backend middleware za login throttling
- password reset throttling
- centralni retry window config

### 6. Cookies/Auth security review

Fajlovi:
- [src/config/config.ts](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/src/config/config.ts)
- [src/modules/auth/auth.controller.ts](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/src/modules/auth/auth.controller.ts)

Problem:
- cookies su `httpOnly` i `signed`, sto je dobro
- ali treba eksplicitno pregledati i definirati:
  - `sameSite`
  - `domain`
  - `path`
  - refresh/access token lifecycle

Preporuka:
- dodati eksplicitni `sameSite` policy
- odvojiti access i refresh cookie policy ako treba
- dokumentirati local vs prod cookie ponasanje

### 7. Secrets/config hygiene

Projekti:
- `infiora-backend-main`
- `infiora-api-main`
- `infiora-django-main`

Nalazi:
- postoje development fallback vrijednosti u compose/docs, sto je normalno
- treba osigurati da nijedna stvarna tajna nije committana

Sto promijeniti:
- proci `.env`, `.env.example`, `docker-compose*`, `appsettings*`, Django settings
- standardizirati:
  - koje varijable su obavezne
  - koje smiju imati dev fallback
  - koje nikad ne smiju imati fallback u produkciji

## Priority 2: Correctness / Local Stability

### 8. Local DB/setup drift treba svesti na jednu bazu i jedan source of truth

Fajlovi:
- [src/config/config.ts](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/src/config/config.ts)
- [setup-local.mjs](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/setup-local.mjs)
- root seed skripte

Problem:
- local auth je vec bio razbijen jer su setup skripte i runtime gledali razlicite Mongo baze

Sto promijeniti:
- definirati jednu development bazu
- sve local setup skripte moraju koristiti istu bazu
- dodati kratku developer dokumentaciju: "koji app koristi koju bazu"

### 9. Dashboard login UX treba jasno pokazivati validation greške

Fajlovi:
- [src/components/common/InputField.tsx](/c:/Users/Tudor/infiora/infiora-dash-main/infiora-dash-main/src/components/common/InputField.tsx)
- [src/views/Login.tsx](/c:/Users/Tudor/infiora/infiora-dash-main/infiora-dash-main/src/views/Login.tsx)

Problem:
- prije je password validation izgledao kao mrtav klik

Sto promijeniti:
- zadrzati helperText za password
- proci ostale custom field varijante i provjeriti da nijedna validation grana ne suti

## Priority 3: Secondary Audit Targets

### 10. `infiora-api-main` auth/config review

Status:
- na brzom pregledu izgleda urednije od legacy Node backenda
- koristi JWT service i dokumentiran auth flow

Sto jos treba detaljno proci:
- `Program.cs`
- auth middleware/filters
- refresh token persistence
- CORS i environment-specific config
- error handling i permission mapping

### 11. `infiora-django-main` staging/dev hardening

Nalazi:
- [staging.py](/c:/Users/Tudor/infiora/infiora-django-main/infiora-django-main/src/core/settings/staging.py) ima:
  - `ALLOWED_HOSTS = ['*']`
  - `CSRF_COOKIE_SECURE = False`
- [dev.py](/c:/Users/Tudor/infiora/infiora-django-main/infiora-django-main/src/core/settings/dev.py) ima `CORS_ALLOW_ALL_ORIGINS = True`

Napomena:
- ovo moze biti prihvatljivo za dev/staging, ali mora biti svjesna odluka

Sto promijeniti:
- staging zatvoriti vise nego sad
- jasno odvojiti dev convenience od staging behaviora

## Suggested Implementation Order

1. Maknuti dashboard auth bypass i demo login route.
2. Popraviti admin AuthGuard da stvarno redirecta.
3. Uskladiti backend roleove i local setup skripte.
4. Dodati anti-spam / anti-bruteforce za auth i password reset.
5. Odraditi cookie/session hardening.
6. Odraditi drugi krug audita za `infiora-api-main` i `infiora-django-main` nakon primary auth cleanup-a.

## Deep Scan Follow-Up Checklist

Kad krenemo u stvarne izmjene, preporuceni redoslijed PR-ova / batch-eva:

- Batch 1: Dashboard auth cleanup
- Batch 2: Admin access-control cleanup
- Batch 3: Backend local/setup consistency
- Batch 4: Auth rate limiting / spam protection
- Batch 5: Cookie/session/CORS hardening
- Batch 6: API + Django secondary audit fixes

## Notes For Later

- ovaj fajl je namjerno audit-only
- ne tretirati ga kao dokaz da je sve ostalo sigurno
- nakon svakog batch-a treba ponoviti review i testirati login, logout, refresh token i password reset flow
