# Language Cache Plan

## Goal

Implement automatic guest-language translation with persistent caching at the **group** level, not room level.

The system should:

- treat each group as the canonical guest-content unit
- always build and cache an English version after content is saved
- lazily build and cache every other language only when a guest actually opens that group in that language
- automatically invalidate only the changed group's cached languages when group content changes
- require no manual cache clearing

This plan replaces the earlier room-level and single-source-language approach.

## Product Rules

### 1. Cache scope is group-based

Cache must be keyed by group, because rooms can be reassigned between groups over time.

Examples:

- morning: rooms use `group A`
- afternoon: same rooms switch to `group B`

Because of that, cache ownership must belong to the group payload, not the room payload.

### 2. Canonical translation flow

The canonical flow is:

1. user saves group content
2. system creates a fresh canonical group payload
3. system invalidates existing cached translations for that group
4. system immediately generates and stores English cache for that group
5. guest requests for non-English languages generate cache only on first access
6. future guests reuse the stored cache

### 3. English is the only preload language

After each content save:

- preload `en`
- do not preload `fr`, `de`, `it`, `es`, or anything else

Reason:

- English is the best universal fallback
- prewarming more languages increases cost unnecessarily
- lazy generation is acceptable because the first guest can wait slightly longer once

### 4. Mixed Croatian and English content

Group content may contain a mix of Croatian and English strings.

Required behavior:

- build the English cache from the full canonical payload
- if some strings are already English, they may stay unchanged
- if some strings are Croatian, they should be translated into English
- result is one unified English cached payload

For other target languages:

- translate from the canonical saved payload
- do not require content authors to separate Croatian-only vs English-only sections manually

Important implementation decision:

- do **not** require manual tagging of source language per section
- do **not** require dashboard language configuration
- translation pipeline should work automatically from the saved content

## Architecture

### 1. Runtime content source

At guest runtime, the source payload should be assembled from:

- group document
- links assigned to that group
- hotel-level guest-visible data that affects rendering
- room-level data only if it is genuinely room-specific and not inherited from group

The cacheable translation unit should be the **final guest payload for a group experience**, excluding room-specific analytics metadata.

### 2. Cache record model

Create a persistent collection, for example `GroupTranslationCache`.

Suggested fields:

```ts
{
  hotel: ObjectId,
  group: ObjectId,
  targetLanguage: string,
  contentHash: string,
  translatedPayload: Mixed,
  status: "pending" | "ready" | "failed",
  characterCount: number,
  error?: string,
  lastUsedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Required unique index:

```ts
{ group: 1, targetLanguage: 1, contentHash: 1 }
```

This guarantees:

- one cached payload per group/language/version
- safe deduplication under concurrent traffic

### 3. Canonical content hash

Each group translation version must be identified by a deterministic `contentHash`.

The hash input should include:

- group guest-visible fields
- active links for that group
- guest-visible hotel settings used in the rendered group experience

The hash input must exclude:

- timestamps
- analytics fields
- activity ids
- transient request metadata
- unrelated room-specific tracking values

Result:

- if nothing guest-visible changed, the hash stays the same
- if any relevant content changed, the hash changes automatically

## Translation Strategy

### 1. English cache generation

On group save, the backend should:

1. assemble the canonical group payload
2. compute the new `contentHash`
3. delete old cache records for that group
4. generate English translated payload
5. save English cache as `status: ready`

English generation logic:

- strings already in English can remain unchanged
- Croatian strings should become English
- mixed content becomes one English payload

This can be implemented in either of these ways:

- simple version: send all translatable strings to Google with `target=en`
- optimized version: detect string language first and skip strings already in English

Recommended rollout:

- phase 1: simple version
- phase 2: optional per-string detection optimization if cost still matters

The simple version is easier and still aligned with the business rule because the result is always a stable English cache.

### 2. Non-English languages

For languages other than English:

- do not generate on save
- generate only when a guest first opens that group in that language
- persist the result
- reuse it until the group content changes again

Example:

- guest opens French for `group X`
- backend checks cache for `group X + fr + contentHash`
- if found, return cached payload
- if not found, generate once, store, return

### 3. Fallback behavior

Recommended fallback order:

1. cached target language
2. cached English
3. canonical source payload

This avoids blank or broken guest pages if translation temporarily fails.

## Invalidation Rules

### 1. Automatic invalidation only

No manual cache clearing should be needed.

The system must automatically invalidate group cache when any guest-visible group content changes.

### 2. What should invalidate group cache

Invalidate that group's cached languages when any of these change:

- group title
- group description
- popup content
- newsletter content
- feedback/survey labels visible to guests
- housekeeping/maintenance labels visible to guests
- background or visual settings only if they are included in the translated payload hash
- any active link attached to that group
- any section/item/button text within group links

### 3. Invalidation scope

Invalidate only the changed group.

Do not clear caches for:

- other groups in the same hotel
- unrelated rooms
- unrelated hotels

### 4. Invalidation method

On every relevant save:

- find all cache records where `group = changedGroupId`
- delete them

This matches your stated rule exactly:

- all historical cached languages for that group are removed
- English is immediately rebuilt
- all other languages start from zero and rebuild lazily

## Save Flow

### 1. Group update flow

When `updateGroupById` succeeds:

1. save group changes
2. recalculate canonical payload for that group
3. delete all cache records for that group
4. enqueue or directly run English cache generation
5. return normal API response to dashboard

English generation should ideally happen asynchronously after persistence, but still be triggered immediately.

### 2. Group link update flow

When a link belonging to a group is created, updated, reordered, activated, deactivated, duplicated, or deleted:

1. detect its owning group
2. invalidate that group's cache
3. rebuild English cache

This is critical because group guest content is not only stored in the group document itself.

### 3. Room reassignment flow

When a room switches from one group to another:

- do not rebuild translation caches for all rooms
- no cache should be keyed by room
- runtime should simply resolve the room's current assigned group and fetch that group's cache

This is the main reason group-level caching is the correct design.

## Guest Runtime Flow

### 1. Request resolution

When guest opens a room URL:

1. backend resolves room
2. backend resolves the room's currently assigned group
3. backend builds or fetches translated payload for that group and requested language
4. backend merges any truly room-specific fields if needed
5. backend returns guest-ready payload

### 2. Requested language behavior

If requested language is:

- `en`: return preloaded English cache if ready, else build it
- any other language: return cached version if ready, else generate and cache

### 3. Concurrency control

Prevent translation stampedes.

If 10 guests open the same uncached language at once:

- only one request should perform Google translation
- others should wait briefly for the ready cache
- if wait timeout expires, serve English fallback

This should be enforced by:

- unique index
- `pending` cache status
- short polling/wait loop

## Suggested Backend Changes

### 1. New translation cache module

Add:

- `src/modules/group-translation-cache/group-translation-cache.model.ts`
- `src/modules/group-translation-cache/group-translation-cache.interfaces.ts`

### 2. New translation service

Add:

- `src/modules/group/group.translation.ts`

Responsibilities:

- assemble canonical group payload
- compute `contentHash`
- extract translatable strings
- call Google Translate
- store/retrieve cache
- invalidate cache
- preload English

### 3. Group payload builder

Add a dedicated builder function, for example:

```ts
buildGroupGuestPayload(groupId, roomId?)
```

Responsibilities:

- fetch group
- fetch active group links
- merge hotel guest-visible settings
- optionally merge room-specific non-translated fields

This builder must be the single source of truth for:

- translation input
- content hashing input
- guest response output

### 4. Update hooks

Add invalidation + English preload triggers to:

- `group.service.ts` after `updateGroupById`
- group create/duplicate if immediate English cache is desired
- `link.service.ts` for links attached to groups
- any reorder endpoint affecting group content order

### 5. Room runtime changes

Current room fetch should stop treating translation as room-owned.

Instead:

- resolve room
- resolve current group
- fetch translated group payload

## Data Integrity Rules

### 1. No manual source-language field required

Do not add dashboard controls for translation source language.

The product requirement is automatic behavior.

### 2. Cache deletion must happen before new English preload

Sequence must be:

1. save content
2. delete old group cache
3. generate/save fresh English cache

This avoids stale English responses after save.

### 3. Failed translation must not break guests

If translation fails:

- log the error
- return English cache if available
- else return canonical source payload

Guest app must still render.

## Rollout Plan

### Phase 1. Correct cache scope

- move cache ownership from room to group
- add `GroupTranslationCache`
- add canonical payload builder
- keep English preload only
- lazy-cache all other languages

### Phase 2. Automatic invalidation

- invalidate group cache on group save
- invalidate group cache on group-link changes
- invalidate group cache on group-link reorder

### Phase 3. Runtime fallback hardening

- add pending-lock behavior
- add English fallback
- add failed-state handling

### Phase 4. Optional optimization

- detect strings already in English and skip retranslation during English preload
- only do this if bills remain too high after Phase 1-3

This optimization is optional because it increases complexity.

## Testing Checklist

### Group save

- update group content
- verify all old cache entries for that group are deleted
- verify fresh English cache is created immediately

### Link save

- update a link under a group
- verify group cache is deleted and English is rebuilt

### First French guest

- no French cache exists
- guest opens group
- French cache is generated
- second French guest gets cached version

### Room reassignment

- room switches from group A to group B
- guest opening that room now receives group B cache
- no room-level translation duplication exists

### Concurrent access

- multiple guests hit same uncached language
- only one translation job runs
- others receive ready cache or English fallback

### Failure handling

- Google API fails
- guest still receives English or canonical payload

## Final Implementation Decision

The target system should be:

- **group-scoped translation cache**
- **automatic invalidation on changed group content**
- **automatic English preload on save**
- **lazy caching for all other languages**
- **no manual cache clearing**
- **no dashboard language management**

This is the implementation plan that best matches the product behavior you described.
