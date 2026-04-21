# Local Dashboard Login Changes

Ovaj fajl biljezi lokalne promjene koje su napravljene da dashboard login opet radi konzistentno u development okruzenju.

## Sto je promijenjeno

### 1. Backend environment fallback je ucinjen konzistentnim

Fajl:
- [src/config/config.ts](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/src/config/config.ts)

Promjena:
- uveden je `runtimeEnv = envVars.NODE_ENV || 'development'`
- isti `runtimeEnv` se sada koristi i za `config.env` i za Mongo URL suffix
- time backend vise ne moze slucajno koristiti bazu `infiora-undefined`

Razlog:
- ranije je `config.env` padao na `development`, ali je Mongo URL koristio sirovi `envVars.NODE_ENV`
- kad `NODE_ENV` nije bio postavljen, backend je zavrsavao na pogresnoj bazi

### 2. Backend .env je eksplicitno postavljen na development

Fajl:
- [infiora-backend-main/.env](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/.env)

Promjena:
- dodano `NODE_ENV=development`

Razlog:
- local backend i skripte sada imaju jasan i stabilan environment

### 3. Local setup skripta sada puni development bazu

Fajl:
- [setup-local.mjs](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/setup-local.mjs)

Promjena:
- baza promijenjena s `infiora` na `infiora-development`
- login URL poruke promijenjene s `http://localhost:3001` na `http://localhost:4001`

Razlog:
- local setup mora puniti istu bazu koju backend koristi u development modu

### 4. Dashboard password validation sada prikazuje poruku

Fajl:
- [InputField.tsx](/c:/Users/Tudor/infiora/infiora-dash-main/infiora-dash-main/src/components/common/InputField.tsx)

Promjena:
- u `case 'password'` dodan `helperText={invalid ? getErrorMessage(...) : ''}`

Razlog:
- prije je klik na login djelovao mrtvo kad password nije valjan, jer je submit bio blokiran ali se greska nije prikazivala

## Kako vratiti promjene kasnije

Ako budemo htjeli vratiti stanje:

1. U [src/config/config.ts](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/src/config/config.ts) ukloniti `runtimeEnv` fallback i vratiti staru logiku za `env`, `mongoose.url` i `cookieOptions.secure`.
2. U [infiora-backend-main/.env](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/.env) ukloniti `NODE_ENV=development`.
3. U [setup-local.mjs](/c:/Users/Tudor/infiora/infiora-backend-main/infiora-backend-main/setup-local.mjs) vratiti bazu na `infiora` i login URL poruke na staru vrijednost ako to opet bude potrebno.
4. U [InputField.tsx](/c:/Users/Tudor/infiora/infiora-dash-main/infiora-dash-main/src/components/common/InputField.tsx) ukloniti `helperText` iz password grane.

## Napomena

Ove promjene su napravljene za lokalni development workflow, da backend, setup skripta i dashboard login koriste isti local kontekst.
