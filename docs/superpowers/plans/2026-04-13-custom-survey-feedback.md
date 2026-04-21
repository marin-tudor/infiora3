# Custom Survey Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodati Custom Feedback Survey koji hotel konfigurira po sobi/grupi — builder pitanja u dashboardu, rendering na app strani, i prikaz odgovora u /feedbacks.

**Architecture:** Survey se sprema kao `survey` polje na Room/Group dokumentu (identično newsletter/feedback pattern-u). Odgovori se čuvaju u postojećem Feedback modelu u novom `surveyAnswers` polju. FeedbackTab u dashboardu dobiva drugu sekciju "Custom Feedback Form" uz postojeći "Leave a review pop-up". Gost vidi survey kao drawer (iz 1-3 ratin flow-a) ili kao standalone button (iz RoomView-a).

**Tech Stack:** Node.js/Express/Mongoose (backend), Next.js 14/TypeScript/MUI v5/RTK Query (dashboard), Next.js 14/TypeScript/MUI v5 (app)

---

## File Map

### Backend (`infiora-backend-main/infiora-backend-main/src/`)
| File | Akcija | Svrha |
|------|--------|-------|
| `modules/room/room.interfaces.ts` | Modify | Dodaj `ISurveyQuestion`, `ISurvey`, extend `IRoom` |
| `modules/room/room.model.ts` | Modify | Dodaj `survey` subdocument schema |
| `modules/room/room.validation.ts` | Modify | Dodaj `survey` Joi validation u `updateRoom` |
| `modules/group/group.interfaces.ts` | Modify | Dodaj `ISurvey`, extend `IGroup` |
| `modules/group/group.model.ts` | Modify | Dodaj `survey` subdocument schema |
| `modules/group/group.validation.ts` | Modify | Dodaj `survey` Joi validation u `updateGroup` |
| `modules/feedback/feedback.interfaces.ts` | Modify | Dodaj `ISurveyAnswer`, extend `IFeedback` |
| `modules/feedback/feedback.model.ts` | Modify | Dodaj `surveyAnswers` polje |
| `modules/room/room.validation.ts` | Modify | Extend `createFeedback` validation za `surveyAnswers` |

### Dashboard (`infiora-dash-main/infiora-dash-main/src/`)
| File | Akcija | Svrha |
|------|--------|-------|
| `types/index.ts` | Modify | Dodaj `ISurveyQuestion`, `ISurvey`, extend `IRoom`/`IGroup` |
| `views/shared/tabs/FeedbackTab.tsx` | Modify | Split na 2 sekcije: Leave a Review + Custom Survey |
| `views/shared/tabs/SurveyTab.tsx` | Create | Survey builder UI — question list, add/edit/delete |
| `views/feedbacks/components/FeedbacksTable.tsx` | Modify | Prikaži `surveyAnswers` u detail view |

### App (`infiora-app-main/infiora-app-main/src/`)
| File | Akcija | Svrha |
|------|--------|-------|
| `types/index.ts` | Modify | Dodaj `ISurveyQuestion`, `ISurvey`, extend `IRoom` |
| `contexts/RoomContext.tsx` | Modify | Dodaj `surveyDialog` |
| `views/rooms/details/components/FeedbackDrawer.tsx` | Modify | Dodaj "Odgovori detaljnije" button i `survey` step |
| `views/rooms/details/components/SurveyDrawer.tsx` | Create | Renderira survey pitanja, šalje odgovore |
| `views/rooms/details/components/RoomView.tsx` | Modify | Dodaj SurveyButton za button mode |

---

## Task 1: Backend — ISurvey interface + Room model

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/room/room.interfaces.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/room/room.model.ts`

- [ ] **Step 1: Dodaj ISurveyQuestion i ISurvey u room.interfaces.ts**

Otvori `src/modules/room/room.interfaces.ts`. Dodaj PRIJE `interface IPopup`:

```ts
export interface ISurveyQuestion {
  id: string;
  type: 'rating' | 'yes_no' | 'single_choice' | 'multi_choice' | 'open_text' | 'nps' | 'matrix' | 'contact';
  text: string;
  options?: string[];       // za single_choice, multi_choice
  matrixRows?: string[];    // redovi za matrix pitanje
  matrixColumns?: string[]; // kolone za matrix pitanje
  required?: boolean;
}

export interface ISurvey {
  isActive?: boolean;
  type?: 'popup' | 'button';
  buttonText?: string;       // tekst u popup modu
  mainButtonText?: string;   // tekst gumba u button modu
  imageType?: 'none' | 'image' | 'icon' | 'url';
  image?: string;
  questions?: ISurveyQuestion[];
}
```

- [ ] **Step 2: Extend IRoom s poljem survey**

U istom fajlu, u `interface IRoom` dodaj:

```ts
  survey?: ISurvey;
```

- [ ] **Step 3: Dodaj survey u room.model.ts**

U `roomSchema` definiciji, iza `feedback: { ... }` bloka, dodaj:

```ts
    survey: {
      isActive: { type: Boolean },
      type: { type: String, enum: ['popup', 'button'] },
      buttonText: { type: String },
      mainButtonText: { type: String },
      imageType: { type: String, enum: ['none', 'image', 'icon', 'url'] },
      image: { type: String },
      questions: [
        {
          id: { type: String },
          type: {
            type: String,
            enum: ['rating', 'yes_no', 'single_choice', 'multi_choice', 'open_text', 'nps', 'matrix', 'contact'],
          },
          text: { type: String },
          options: [{ type: String }],
          matrixRows: [{ type: String }],
          matrixColumns: [{ type: String }],
          required: { type: Boolean },
        },
      ],
    },
```

- [ ] **Step 4: Commit**

```bash
cd infiora-backend-main/infiora-backend-main
git add src/modules/room/room.interfaces.ts src/modules/room/room.model.ts
git commit -m "feat: add ISurvey interface and survey field to Room model"
```

---

## Task 2: Backend — ISurvey na Group modelu

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/group/group.interfaces.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/group/group.model.ts`

- [ ] **Step 1: Extend group.interfaces.ts**

Otvori `src/modules/group/group.interfaces.ts`. Uvezi ISurveyQuestion/ISurvey iz room.interfaces ili dupliciraj (preporučujem import):

```ts
import { ISurvey } from '../room/room.interfaces';
```

U `interface IGroup` dodaj:

```ts
  survey?: ISurvey;
```

- [ ] **Step 2: Dodaj survey subdocument u group.model.ts**

U `groupSchema`, iza `feedback: { ... }` bloka, dodaj identičan survey blok kao u Task 1 Step 3.

```ts
    survey: {
      isActive: { type: Boolean },
      type: { type: String, enum: ['popup', 'button'] },
      buttonText: { type: String },
      mainButtonText: { type: String },
      imageType: { type: String, enum: ['none', 'image', 'icon', 'url'] },
      image: { type: String },
      questions: [
        {
          id: { type: String },
          type: {
            type: String,
            enum: ['rating', 'yes_no', 'single_choice', 'multi_choice', 'open_text', 'nps', 'matrix', 'contact'],
          },
          text: { type: String },
          options: [{ type: String }],
          matrixRows: [{ type: String }],
          matrixColumns: [{ type: String }],
          required: { type: Boolean },
        },
      ],
    },
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/group/group.interfaces.ts src/modules/group/group.model.ts
git commit -m "feat: add survey field to Group model"
```

---

## Task 3: Backend — Validation za survey (Room + Group)

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/room/room.validation.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/group/group.validation.ts`

- [ ] **Step 1: Dodaj survey validation u room.validation.ts**

U `updateRoom.body` Joi objektu, iza `feedback: Joi.any()`, dodaj:

```ts
    survey: Joi.object()
      .keys({
        isActive: Joi.boolean(),
        type: Joi.string().valid('popup', 'button').allow(null, ''),
        buttonText: Joi.string().allow(null, ''),
        mainButtonText: Joi.string().allow(null, ''),
        imageType: Joi.string().valid('none', 'icon', 'image', 'url'),
        image: Joi.any(),
        questions: Joi.array().items(
          Joi.object({
            id: Joi.string(),
            type: Joi.string().valid(
              'rating', 'yes_no', 'single_choice', 'multi_choice',
              'open_text', 'nps', 'matrix', 'contact'
            ),
            text: Joi.string().allow(''),
            options: Joi.array().items(Joi.string()),
            matrixRows: Joi.array().items(Joi.string()),
            matrixColumns: Joi.array().items(Joi.string()),
            required: Joi.boolean(),
          })
        ),
      })
      .allow(null, ''),
```

- [ ] **Step 2: Dodaj survey validation u group.validation.ts**

Pronađi `updateGroup.body` Joi objekt (iza `feedback: Joi.any()`), dodaj identičan survey blok kao u Step 1.

- [ ] **Step 3: Commit**

```bash
git add src/modules/room/room.validation.ts src/modules/group/group.validation.ts
git commit -m "feat: add survey Joi validation for room and group update"
```

---

## Task 4: Backend — Feedback model proširi sa surveyAnswers

**Files:**
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/feedback/feedback.interfaces.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/feedback/feedback.model.ts`
- Modify: `infiora-backend-main/infiora-backend-main/src/modules/room/room.validation.ts` (createFeedback)

- [ ] **Step 1: Dodaj ISurveyAnswer u feedback.interfaces.ts**

Dodaj na vrhu fajla:

```ts
export interface ISurveyAnswer {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: any; // string | string[] | number | boolean | Record<string, number>
}
```

U `interface IFeedback` dodaj:

```ts
  surveyAnswers?: ISurveyAnswer[];
```

U `type NewCreatedFeedback` — ono je `IFeedback` alias, pa je automatski prošireno.

- [ ] **Step 2: Dodaj surveyAnswers u feedback.model.ts**

U `feedbackSchema`, iza `message: String`, dodaj:

```ts
    surveyAnswers: [
      {
        questionId: { type: String },
        questionText: { type: String },
        questionType: { type: String },
        answer: { type: mongoose.Schema.Types.Mixed },
      },
    ],
```

- [ ] **Step 3: Extend createFeedback validation**

U `src/modules/room/room.validation.ts`, u `createFeedback.body` Joi objektu, iza `message: Joi.string().allow(null, '')` dodaj:

```ts
    surveyAnswers: Joi.array().items(
      Joi.object({
        questionId: Joi.string(),
        questionText: Joi.string().allow(''),
        questionType: Joi.string(),
        answer: Joi.any(),
      })
    ),
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/feedback/feedback.interfaces.ts src/modules/feedback/feedback.model.ts src/modules/room/room.validation.ts
git commit -m "feat: add surveyAnswers to Feedback model"
```

---

## Task 5: Dashboard — Dodaj ISurvey u frontend tipove

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/types/index.ts`

- [ ] **Step 1: Dodaj ISurveyQuestion i ISurvey**

U `src/types/index.ts`, odmah iza `export interface IFeedback { ... }`, dodaj:

```ts
export interface ISurveyQuestion {
  id: string
  type: 'rating' | 'yes_no' | 'single_choice' | 'multi_choice' | 'open_text' | 'nps' | 'matrix' | 'contact'
  text: string
  options?: string[]
  matrixRows?: string[]
  matrixColumns?: string[]
  required?: boolean
}

export interface ISurvey {
  isActive?: boolean
  type?: 'popup' | 'button'
  buttonText?: string
  mainButtonText?: string
  imageType?: 'none' | 'image' | 'icon' | 'url'
  image?: string
  questions?: ISurveyQuestion[]
}
```

- [ ] **Step 2: Extend IRoom i IGroup**

U `interface IRoom` i `interface IGroup`, iza `feedback?: IFeedback`, dodaj:

```ts
  survey?: ISurvey
```

- [ ] **Step 3: Commit**

```bash
cd infiora-dash-main/infiora-dash-main
git add src/types/index.ts
git commit -m "feat: add ISurvey types to dashboard"
```

---

## Task 6: Dashboard — Kreiraj SurveyTab komponentu (survey builder)

**Files:**
- Create: `infiora-dash-main/infiora-dash-main/src/views/shared/tabs/SurveyTab.tsx`

Ova komponenta je survey builder. Hotel može dodavati/brisati pitanja, birati tip, upisivati tekst i opcije.

- [ ] **Step 1: Kreiraj SurveyTab.tsx**

```tsx
import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Box, Button, Card, CardContent, Divider, Grid, IconButton,
  MenuItem, Select, Stack, TextField, Typography, useTheme
} from '@mui/material'
import { Add, Delete, DragIndicator } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import { toast } from 'react-toastify'
import IconPicker from 'react-icons-picker'

import { useUpdateRoomMutation } from '@/redux/api/roomApi'
import { useUpdateGroupMutation } from '@/redux/api/groupApi'
import type { IGroup, ILink, IRoom, ISurvey, ISurveyQuestion } from '@/types'
import InputField from '@/components/common/InputField'
import ImagePicker from '@/components/widgets/ImagePicker'
import ColorPicker from '@/components/widgets/ColorPicker'
import { useDictionary } from '@/contexts/DictionaryContext'
import RoomPreview from '@/views/shared/RoomPreview'

const QUESTION_TYPES = [
  { value: 'rating',        label: 'Rating (1-5 zvjezdica)' },
  { value: 'yes_no',        label: 'Da / Ne' },
  { value: 'single_choice', label: 'Jedan odgovor (višestruki izbor)' },
  { value: 'multi_choice',  label: 'Više odgovora odjednom' },
  { value: 'open_text',     label: 'Otvoreno pitanje (svojm riječima)' },
  { value: 'nps',           label: 'NPS pitanje (0-10)' },
  { value: 'matrix',        label: 'Matrica pitanja (više stavki)' },
  { value: 'contact',       label: 'Kontakt (opcionalni email/telefon)' },
]

const needsOptions = (type: string) => ['single_choice', 'multi_choice'].includes(type)
const needsMatrix = (type: string) => type === 'matrix'

interface SurveyTabProps {
  room?: IRoom
  group?: IGroup
  links: ILink[]
}

const SurveyTab: React.FC<SurveyTabProps> = ({ room, group, links }) => {
  const s = room || group
  const dictionary = useDictionary()
  const theme = useTheme()

  const [updateRoom, { isLoading: isUpdatingRoom }] = useUpdateRoomMutation()
  const [updateGroup, { isLoading: isUpdatingGroup }] = useUpdateGroupMutation()

  const initSurvey = (): ISurvey => ({
    isActive: s?.survey?.isActive ?? false,
    type: s?.survey?.type ?? 'popup',
    buttonText: s?.survey?.buttonText ?? '',
    mainButtonText: s?.survey?.mainButtonText ?? '',
    imageType: s?.survey?.imageType ?? 'none',
    image: s?.survey?.image ?? '',
    questions: s?.survey?.questions ?? [],
  })

  const [survey, setSurvey] = useState<ISurvey>(initSurvey)

  const addQuestion = () => {
    const newQ: ISurveyQuestion = {
      id: uuidv4(),
      type: 'rating',
      text: '',
      options: [],
      matrixRows: [],
      matrixColumns: [],
      required: false,
    }
    setSurvey(prev => ({ ...prev, questions: [...(prev.questions ?? []), newQ] }))
  }

  const updateQuestion = (id: string, patch: Partial<ISurveyQuestion>) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q => (q.id === id ? { ...q, ...patch } : q)),
    }))
  }

  const removeQuestion = (id: string) => {
    setSurvey(prev => ({ ...prev, questions: (prev.questions ?? []).filter(q => q.id !== id) }))
  }

  const addOption = (qId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q =>
        q.id === qId ? { ...q, options: [...(q.options ?? []), ''] } : q
      ),
    }))
  }

  const updateOption = (qId: string, idx: number, value: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q => {
        if (q.id !== qId) return q
        const opts = [...(q.options ?? [])]
        opts[idx] = value
        return { ...q, options: opts }
      }),
    }))
  }

  const removeOption = (qId: string, idx: number) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q => {
        if (q.id !== qId) return q
        const opts = [...(q.options ?? [])]
        opts.splice(idx, 1)
        return { ...q, options: opts }
      }),
    }))
  }

  const addMatrixRow = (qId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q =>
        q.id === qId ? { ...q, matrixRows: [...(q.matrixRows ?? []), ''] } : q
      ),
    }))
  }

  const updateMatrixRow = (qId: string, idx: number, value: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q => {
        if (q.id !== qId) return q
        const rows = [...(q.matrixRows ?? [])]
        rows[idx] = value
        return { ...q, matrixRows: rows }
      }),
    }))
  }

  const removeMatrixRow = (qId: string, idx: number) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q => {
        if (q.id !== qId) return q
        const rows = [...(q.matrixRows ?? [])]
        rows.splice(idx, 1)
        return { ...q, matrixRows: rows }
      }),
    }))
  }

  const addMatrixColumn = (qId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q =>
        q.id === qId ? { ...q, matrixColumns: [...(q.matrixColumns ?? []), ''] } : q
      ),
    }))
  }

  const updateMatrixColumn = (qId: string, idx: number, value: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q => {
        if (q.id !== qId) return q
        const cols = [...(q.matrixColumns ?? [])]
        cols[idx] = value
        return { ...q, matrixColumns: cols }
      }),
    }))
  }

  const removeMatrixColumn = (qId: string, idx: number) => {
    setSurvey(prev => ({
      ...prev,
      questions: (prev.questions ?? []).map(q => {
        if (q.id !== qId) return q
        const cols = [...(q.matrixColumns ?? [])]
        cols.splice(idx, 1)
        return { ...q, matrixColumns: cols }
      }),
    }))
  }

  const handleSave = async () => {
    try {
      if (room) {
        await updateRoom({ id: room.id, room: { survey } }).unwrap()
        toast.success(dictionary.messages.updateRoomSuccess)
      } else if (group) {
        await updateGroup({ id: group.id, group: { survey } }).unwrap()
        toast.success(dictionary.messages.updateGroupSuccess)
      }
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  const handleCancel = () => setSurvey(initSurvey())

  const renderImagePicker = () => {
    switch (survey.imageType) {
      case 'icon':
        return (
          <Stack gap={1}>
            <Typography variant='body2'>Icon</Typography>
            <Stack direction='row' alignItems='center' gap={2}>
              <IconPicker
                value={survey.image || 'TiCancel'}
                onChange={(value: string) => setSurvey(prev => ({ ...prev, image: value }))}
              />
              {survey.image && (
                <Button color='error' onClick={() => setSurvey(prev => ({ ...prev, image: '' }))}>
                  {dictionary.remove}
                </Button>
              )}
            </Stack>
          </Stack>
        )
      case 'image':
        return (
          <ImagePicker
            id='survey-image'
            label='Image'
            description=''
            image={survey.image}
            setImage={(value: string) => setSurvey(prev => ({ ...prev, image: value }))}
          />
        )
      case 'url':
        return (
          <TextField
            variant='standard'
            size='small'
            InputLabelProps={{ shrink: true }}
            label='Image URL'
            value={survey.image}
            onChange={e => setSurvey(prev => ({ ...prev, image: e.target.value }))}
            fullWidth
          />
        )
      default:
        return null
    }
  }

  const hasQuestions = (survey.questions ?? []).length > 0

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
      <form noValidate autoComplete='off' style={{ flex: 1 }}>
        <Stack gap={0} flex={1} height={{ md: 550 }} sx={{ position: 'relative' }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Typography variant='h5'>Custom Feedback Form</Typography>
            <Stack direction='row' alignItems='center' gap={1}>
              <Typography variant='body2' color='text.secondary'>
                {survey.isActive ? 'Active' : 'Inactive'}
              </Typography>
              <Box
                component='label'
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                <input
                  type='checkbox'
                  checked={survey.isActive ?? false}
                  onChange={e => setSurvey(prev => ({ ...prev, isActive: e.target.checked }))}
                  style={{ display: 'none' }}
                />
                <Box
                  sx={{
                    width: 42,
                    height: 24,
                    borderRadius: 12,
                    bgcolor: survey.isActive ? 'primary.main' : 'grey.400',
                    position: 'relative',
                    transition: 'background 0.2s',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      bgcolor: 'white',
                      top: 3,
                      left: survey.isActive ? 21 : 3,
                      transition: 'left 0.2s',
                    },
                  }}
                />
              </Box>
            </Stack>
          </Stack>

          <Grid
            container
            spacing={2}
            sx={{ overflowY: 'auto', scrollbarWidth: 'none', mt: 2, pb: 20 }}
          >
            {/* Type: popup ili button */}
            <Grid item xs={12}>
              <Stack gap={1}>
                <Typography variant='body2'>Tip prikaza</Typography>
                <Stack direction='row' gap={1}>
                  {(['popup', 'button'] as const).map(t => (
                    <Button
                      key={t}
                      variant={survey.type === t ? 'contained' : 'outlined'}
                      size='small'
                      onClick={() => setSurvey(prev => ({ ...prev, type: t }))}
                    >
                      {t === 'popup' ? 'Popup' : 'Button'}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            </Grid>

            {/* Popup button text */}
            <Grid item xs={12}>
              <TextField
                variant='standard'
                size='small'
                InputLabelProps={{ shrink: true }}
                label='Tekst gumba u popupu (npr. "Odgovori detaljnije")'
                value={survey.buttonText ?? ''}
                onChange={e => setSurvey(prev => ({ ...prev, buttonText: e.target.value }))}
                fullWidth
              />
            </Grid>

            {/* Button mode settings */}
            {survey.type === 'button' && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' sx={{ mb: 2 }}>Button Settings</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          variant='standard'
                          size='small'
                          InputLabelProps={{ shrink: true }}
                          label='Tekst standalone gumba'
                          value={survey.mainButtonText ?? ''}
                          onChange={e => setSurvey(prev => ({ ...prev, mainButtonText: e.target.value }))}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack gap={1}>
                          <Typography variant='body2'>Image Type</Typography>
                          <Stack direction='row' gap={1}>
                            {(['none', 'icon', 'image', 'url'] as const).map(t => (
                              <Button
                                key={t}
                                variant={survey.imageType === t ? 'contained' : 'outlined'}
                                size='small'
                                onClick={() => setSurvey(prev => ({ ...prev, imageType: t, image: '' }))}
                              >
                                {t}
                              </Button>
                            ))}
                          </Stack>
                        </Stack>
                      </Grid>
                      {survey.imageType !== 'none' && (
                        <Grid item xs={12}>
                          {renderImagePicker()}
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Questions */}
            <Grid item xs={12}>
              <Stack direction='row' alignItems='center' justifyContent='space-between'>
                <Typography variant='subtitle1' fontWeight={600}>
                  Pitanja ({(survey.questions ?? []).length})
                </Typography>
                <Button startIcon={<Add />} variant='outlined' size='small' onClick={addQuestion}>
                  Dodaj pitanje
                </Button>
              </Stack>
            </Grid>

            {(survey.questions ?? []).map((q, qIdx) => (
              <Grid item xs={12} key={q.id}>
                <Card variant='outlined'>
                  <CardContent>
                    <Stack gap={2}>
                      <Stack direction='row' alignItems='center' gap={1}>
                        <DragIndicator sx={{ color: 'text.disabled', cursor: 'grab' }} />
                        <Typography variant='body2' color='text.secondary'>
                          #{qIdx + 1}
                        </Typography>
                        <Select
                          size='small'
                          value={q.type}
                          onChange={e =>
                            updateQuestion(q.id, {
                              type: e.target.value as ISurveyQuestion['type'],
                              options: [],
                              matrixRows: [],
                              matrixColumns: [],
                            })
                          }
                          sx={{ minWidth: 220 }}
                        >
                          {QUESTION_TYPES.map(qt => (
                            <MenuItem key={qt.value} value={qt.value}>
                              {qt.label}
                            </MenuItem>
                          ))}
                        </Select>
                        <Box flex={1} />
                        <IconButton size='small' color='error' onClick={() => removeQuestion(q.id)}>
                          <Delete />
                        </IconButton>
                      </Stack>

                      {q.type !== 'contact' && (
                        <TextField
                          variant='standard'
                          size='small'
                          InputLabelProps={{ shrink: true }}
                          label='Tekst pitanja'
                          value={q.text}
                          onChange={e => updateQuestion(q.id, { text: e.target.value })}
                          fullWidth
                        />
                      )}

                      {/* Options za single_choice i multi_choice */}
                      {needsOptions(q.type) && (
                        <Stack gap={1}>
                          <Typography variant='body2' color='text.secondary'>
                            Ponuđeni odgovori
                          </Typography>
                          {(q.options ?? []).map((opt, oIdx) => (
                            <Stack key={oIdx} direction='row' alignItems='center' gap={1}>
                              <TextField
                                variant='standard'
                                size='small'
                                value={opt}
                                onChange={e => updateOption(q.id, oIdx, e.target.value)}
                                placeholder={`Odgovor ${oIdx + 1}`}
                                fullWidth
                              />
                              <IconButton size='small' onClick={() => removeOption(q.id, oIdx)}>
                                <Delete fontSize='small' />
                              </IconButton>
                            </Stack>
                          ))}
                          <Button
                            startIcon={<Add />}
                            size='small'
                            onClick={() => addOption(q.id)}
                            sx={{ alignSelf: 'flex-start' }}
                          >
                            Dodaj odgovor
                          </Button>
                        </Stack>
                      )}

                      {/* Matrix rows i columns */}
                      {needsMatrix(q.type) && (
                        <Stack gap={2}>
                          <Stack gap={1}>
                            <Typography variant='body2' color='text.secondary'>
                              Redovi (stavke)
                            </Typography>
                            {(q.matrixRows ?? []).map((row, rIdx) => (
                              <Stack key={rIdx} direction='row' alignItems='center' gap={1}>
                                <TextField
                                  variant='standard'
                                  size='small'
                                  value={row}
                                  onChange={e => updateMatrixRow(q.id, rIdx, e.target.value)}
                                  placeholder={`Stavka ${rIdx + 1}`}
                                  fullWidth
                                />
                                <IconButton size='small' onClick={() => removeMatrixRow(q.id, rIdx)}>
                                  <Delete fontSize='small' />
                                </IconButton>
                              </Stack>
                            ))}
                            <Button startIcon={<Add />} size='small' onClick={() => addMatrixRow(q.id)} sx={{ alignSelf: 'flex-start' }}>
                              Dodaj stavku
                            </Button>
                          </Stack>
                          <Stack gap={1}>
                            <Typography variant='body2' color='text.secondary'>
                              Kolone (opcije ocjenjivanja)
                            </Typography>
                            {(q.matrixColumns ?? []).map((col, cIdx) => (
                              <Stack key={cIdx} direction='row' alignItems='center' gap={1}>
                                <TextField
                                  variant='standard'
                                  size='small'
                                  value={col}
                                  onChange={e => updateMatrixColumn(q.id, cIdx, e.target.value)}
                                  placeholder={`Kolona ${cIdx + 1}`}
                                  fullWidth
                                />
                                <IconButton size='small' onClick={() => removeMatrixColumn(q.id, cIdx)}>
                                  <Delete fontSize='small' />
                                </IconButton>
                              </Stack>
                            ))}
                            <Button startIcon={<Add />} size='small' onClick={() => addMatrixColumn(q.id)} sx={{ alignSelf: 'flex-start' }}>
                              Dodaj kolonu
                            </Button>
                          </Stack>
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Stack sx={{ position: 'absolute', zIndex: 10, bottom: 0, width: '100%' }}>
            <Box
              sx={{
                height: 50,
                width: '100%',
                background: `linear-gradient(transparent, ${theme.palette.background.default})`,
              }}
            />
            <Stack
              direction='row'
              justifyContent='end'
              gap={2}
              sx={{ background: theme.palette.background.default }}
            >
              <Button variant='outlined' onClick={handleCancel}>
                {dictionary.cancel}
              </Button>
              <LoadingButton
                loading={isUpdatingRoom || isUpdatingGroup}
                onClick={handleSave}
                variant='contained'
                disabled={isUpdatingRoom || isUpdatingGroup}
              >
                {dictionary.save}
              </LoadingButton>
            </Stack>
          </Stack>
        </Stack>
      </form>
      <Divider orientation='vertical' flexItem />
      <RoomPreview room={{ ...s, survey }} links={links} />
    </Stack>
  )
}

export default SurveyTab
```

- [ ] **Step 2: Provjeri postoji li `uuid` paket**

```bash
cd infiora-dash-main/infiora-dash-main
grep '"uuid"' package.json
```

Ako ne postoji:
```bash
npm install uuid @types/uuid
```

- [ ] **Step 3: Commit**

```bash
git add src/views/shared/tabs/SurveyTab.tsx
git commit -m "feat: add SurveyTab survey builder component"
```

---

## Task 7: Dashboard — Dodaj SurveyTab u FeedbackTab (split na 2 sekcije)

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/views/shared/tabs/FeedbackTab.tsx`

FeedbackTab treba postati container koji prikazuje 2 sub-sekcije, jednu ispod druge (sa Divider-om između). Gornja sekcija je postojeći "Leave a review pop-up" (ne mijenjamo logiku), donja je SurveyTab.

- [ ] **Step 1: Zamijeni FeedbackTab.tsx sadržaj**

Promijeni return blok u `FeedbackTab.tsx` — postojeći form ostaje nepromijenjen, samo se ispod njega dodaje SurveyTab u zasebnoj sekciji. Wrappe oboje u vertikalni Stack:

```tsx
// Na vrhu fajla dodaj import:
import SurveyTab from '@/views/shared/tabs/SurveyTab'

// Zamijeni return():
return (
  <Stack gap={6}>
    {/* Sekcija 1: Leave a review pop-up */}
    <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
      <form noValidate autoComplete='off' style={{ flex: 1 }}>
        <Stack gap={0} flex={1} height={{ md: 550 }} sx={{ position: 'relative' }}>
          {/* --- PASTE cijeli postojeći form sadržaj ovdje bez izmjena --- */}
        </Stack>
      </form>
      <Divider orientation='vertical' flexItem />
      <RoomPreview room={{ ...s, feedback: watchValues }} links={links} showFeedback={true} />
    </Stack>

    <Divider />

    {/* Sekcija 2: Custom Feedback Form */}
    <SurveyTab room={room} group={group} links={links} />
  </Stack>
)
```

**Napomena:** Unutar prve sekcije ostaje ISTI form sadržaj od linije 90 do 195 u originalnom FeedbackTab.tsx. Samo ga premještaš u novi wrapper Stack.

- [ ] **Step 2: Commit**

```bash
git add src/views/shared/tabs/FeedbackTab.tsx
git commit -m "feat: split FeedbackTab into Leave-a-Review and Custom Survey sections"
```

---

## Task 8: Dashboard — Update FeedbacksTable za prikaz surveyAnswers

**Files:**
- Modify: `infiora-dash-main/infiora-dash-main/src/views/feedbacks/components/FeedbacksTable.tsx`

- [ ] **Step 1: Dodaj rating kolonu i proširi detail popup**

Dodaj `rating` kolonu u `columns` array:

```tsx
{
  field: 'rating',
  headerName: dictionary.rating,
  flex: 1,
  renderCell: ({ row }: any) => {
    return row.rating ? '⭐'.repeat(row.rating) : '-'
  }
},
```

U Swal.fire `html` string, dodaj prikaz surveyAnswers nakon postojećeg `message` retka:

```tsx
html: `
  <div style="text-align: left;">
    <p><strong>${dictionary.email}:</strong> ${feedback.email || '-'}</p>
    <p><strong>${dictionary.rating}:</strong> ${'⭐'.repeat(feedback.rating || 0)}</p>
    <p><strong>${dictionary.message}:</strong> ${feedback.message || '-'}</p>
    ${
      feedback.surveyAnswers && feedback.surveyAnswers.length > 0
        ? `<hr/><p><strong>Survey odgovori:</strong></p>` +
          feedback.surveyAnswers
            .map(
              (a: any) =>
                `<p><em>${a.questionText}</em><br/>
                 ${Array.isArray(a.answer)
                   ? a.answer.join(', ')
                   : typeof a.answer === 'object' && a.answer !== null
                   ? Object.entries(a.answer)
                       .map(([k, v]) => `${k}: ${v}`)
                       .join(', ')
                   : String(a.answer ?? '-')
                 }</p>`
            )
            .join('')
        : ''
    }
    <p><strong>${dictionary.submitedAt}:</strong> ${date}</p>
  </div>
`,
```

- [ ] **Step 2: Commit**

```bash
git add src/views/feedbacks/components/FeedbacksTable.tsx
git commit -m "feat: show rating column and surveyAnswers in feedbacks table detail view"
```

---

## Task 9: App — Dodaj ISurvey u app tipove i RoomContext

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/types/index.ts`
- Modify: `infiora-app-main/infiora-app-main/src/contexts/RoomContext.tsx`

- [ ] **Step 1: Dodaj ISurveyQuestion i ISurvey u app types/index.ts**

Odmah iza `export interface IFeedback { ... }` dodaj:

```ts
export interface ISurveyQuestion {
  id: string;
  type: 'rating' | 'yes_no' | 'single_choice' | 'multi_choice' | 'open_text' | 'nps' | 'matrix' | 'contact';
  text: string;
  options?: string[];
  matrixRows?: string[];
  matrixColumns?: string[];
  required?: boolean;
}

export interface ISurvey {
  isActive?: boolean;
  type?: 'popup' | 'button';
  buttonText?: string;
  mainButtonText?: string;
  imageType?: 'none' | 'image' | 'icon' | 'url';
  image?: string;
  questions?: ISurveyQuestion[];
}
```

U `interface IRoom`, iza `feedback?: IFeedback`, dodaj:

```ts
  survey?: ISurvey;
```

- [ ] **Step 2: Dodaj surveyDialog u RoomContext.tsx**

U `RoomContext.tsx` pronađi gdje su definirani `newsletterDialog` i `feedbackDialog` (oko linije gdje piše `useDialog<null>()`). Dodaj:

```ts
const surveyDialog = useDialog<null>();
```

U `isDialogOpen` useMemo dependency array i provjeri uvrstiti `surveyDialog.isOpen`.

U `value` objekta koji se vraća iz providera, dodaj:

```ts
surveyDialog,
```

U TypeScript `interface RoomContextType` (ili gdje god je definiran tip konteksta), dodaj:

```ts
surveyDialog: DialogReturnType<null>;
```

- [ ] **Step 3: Commit**

```bash
cd infiora-app-main/infiora-app-main
git add src/types/index.ts src/contexts/RoomContext.tsx
git commit -m "feat: add ISurvey types and surveyDialog to app"
```

---

## Task 10: App — Kreiraj SurveyDrawer komponentu

**Files:**
- Create: `infiora-app-main/infiora-app-main/src/views/rooms/details/components/SurveyDrawer.tsx`

SurveyDrawer renderira pitanja jedno po jedno (stepper stil) i na kraju šalje odgovore zajedno s feedbackom ili zasebno ako je pokrenuto kao standalone button.

- [ ] **Step 1: Kreiraj SurveyDrawer.tsx**

```tsx
"use client";
import React, { useState } from "react";
import {
  Drawer,
  Typography,
  Stack,
  Button,
  Box,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  LinearProgress,
} from "@mui/material";
import { Rating } from "react-simple-star-rating";
import { toast } from "react-toastify";
import { IRoom, ISurveyQuestion } from "@/types";

interface SurveyDrawerProps {
  room: IRoom;
  onClose: () => void;
  /** Ako je predan rating (iz FeedbackDrawer-a), survey odgovori se šalju zajedno s feedback submisijonom */
  prefillRating?: number;
  prefillEmail?: string;
  prefillMessage?: string;
}

type SurveyAnswer = string | string[] | number | boolean | Record<string, string>;

const QuestionRenderer = ({
  question,
  answer,
  setAnswer,
}: {
  question: ISurveyQuestion;
  answer: SurveyAnswer | undefined;
  setAnswer: (val: SurveyAnswer) => void;
}) => {
  switch (question.type) {
    case "rating":
      return (
        <Stack alignItems="center">
          <Rating
            initialValue={(answer as number) || 0}
            onClick={(val) => setAnswer(val)}
            size={28}
            allowFraction={false}
            fillColor="#FFD54F"
            emptyColor="#E0E0E0"
            SVGstyle={{ display: "inline-block" }}
          />
        </Stack>
      );

    case "yes_no":
      return (
        <RadioGroup
          value={answer ?? ""}
          onChange={(e) => setAnswer(e.target.value)}
          row
        >
          <FormControlLabel value="yes" control={<Radio />} label="Da" />
          <FormControlLabel value="no" control={<Radio />} label="Ne" />
        </RadioGroup>
      );

    case "single_choice":
      return (
        <RadioGroup
          value={answer ?? ""}
          onChange={(e) => setAnswer(e.target.value)}
        >
          {(question.options ?? []).map((opt) => (
            <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
          ))}
        </RadioGroup>
      );

    case "multi_choice": {
      const selected = (answer as string[]) ?? [];
      return (
        <Stack>
          {(question.options ?? []).map((opt) => (
            <FormControlLabel
              key={opt}
              label={opt}
              control={
                <Checkbox
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) setAnswer([...selected, opt]);
                    else setAnswer(selected.filter((s) => s !== opt));
                  }}
                />
              }
            />
          ))}
        </Stack>
      );
    }

    case "open_text":
      return (
        <TextField
          multiline
          rows={3}
          fullWidth
          size="small"
          value={(answer as string) ?? ""}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Vaš odgovor..."
        />
      );

    case "nps":
      return (
        <Stack gap={1}>
          <Slider
            min={0}
            max={10}
            step={1}
            marks
            value={(answer as number) ?? 0}
            onChange={(_, val) => setAnswer(val as number)}
            valueLabelDisplay="auto"
          />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              0 - Nimalo vjerovatno
            </Typography>
            <Typography variant="caption" color="text.secondary">
              10 - Vrlo vjerovatno
            </Typography>
          </Stack>
        </Stack>
      );

    case "matrix": {
      const matrixAnswer = (answer as Record<string, string>) ?? {};
      return (
        <Stack gap={2} sx={{ overflowX: "auto" }}>
          {(question.matrixRows ?? []).map((row) => (
            <Stack key={row} gap={1}>
              <Typography variant="body2" fontWeight={500}>
                {row}
              </Typography>
              <RadioGroup
                row
                value={matrixAnswer[row] ?? ""}
                onChange={(e) =>
                  setAnswer({ ...matrixAnswer, [row]: e.target.value })
                }
              >
                {(question.matrixColumns ?? []).map((col) => (
                  <FormControlLabel
                    key={col}
                    value={col}
                    control={<Radio size="small" />}
                    label={col}
                  />
                ))}
              </RadioGroup>
            </Stack>
          ))}
        </Stack>
      );
    }

    case "contact":
      return (
        <Stack gap={2}>
          <TextField
            size="small"
            label="Email (opcionalno)"
            type="email"
            fullWidth
            value={((answer as Record<string, string>) ?? {}).email ?? ""}
            onChange={(e) =>
              setAnswer({
                ...((answer as Record<string, string>) ?? {}),
                email: e.target.value,
              })
            }
          />
          <TextField
            size="small"
            label="Telefon (opcionalno)"
            type="tel"
            fullWidth
            value={((answer as Record<string, string>) ?? {}).phone ?? ""}
            onChange={(e) =>
              setAnswer({
                ...((answer as Record<string, string>) ?? {}),
                phone: e.target.value,
              })
            }
          />
        </Stack>
      );

    default:
      return null;
  }
};

const SurveyDrawer: React.FC<SurveyDrawerProps> = ({
  room,
  onClose,
  prefillRating,
  prefillEmail,
  prefillMessage,
}) => {
  const questions = room.survey?.questions ?? [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;

  const handleNext = () => {
    if (currentQuestion?.required && !answers[currentQuestion.id]) {
      toast.error("Ovo pitanje je obavezno.");
      return;
    }
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("API URL not configured");

      const surveyAnswers = questions.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        questionType: q.type,
        answer: answers[q.id] ?? null,
      }));

      const body: any = {
        room: room.id,
        hotel: room.hotel.id,
        surveyAnswers,
      };

      // Ako imamo prefill podatke iz rating flow-a, šaljemo zajedno
      if (prefillRating !== undefined) {
        body.rating = prefillRating;
        body.email = prefillEmail ?? "";
        body.message = prefillMessage ?? "";
      }

      const response = await fetch(`${baseUrl}/v1/rooms/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to submit survey");

      toast.success("Hvala na odgovorima!");
      setDone(true);
    } catch (error) {
      toast.error("Nešto je pošlo po krivu. Pokušaj ponovo.");
    } finally {
      setLoading(false);
    }
  };

  if (questions.length === 0) return null;

  return (
    <Drawer
      anchor="bottom"
      open={true}
      onClose={onClose}
      PaperProps={{
        sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 3, maxHeight: "80vh" },
      }}
    >
      {done ? (
        <Stack spacing={3} alignItems="center">
          <Typography variant="h6" fontWeight="bold" textAlign="center">
            Hvala!
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Vaši odgovori su zabilježeni.
          </Typography>
          <Button variant="contained" onClick={onClose} sx={{ borderRadius: 2 }}>
            Zatvori
          </Button>
        </Stack>
      ) : (
        <Stack spacing={3}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption" color="text.secondary" textAlign="right">
            {currentIdx + 1} / {questions.length}
          </Typography>

          {currentQuestion && (
            <Stack spacing={2}>
              {currentQuestion.type !== "contact" && (
                <Typography variant="body1" fontWeight={500}>
                  {currentQuestion.text}
                  {currentQuestion.required && (
                    <Typography component="span" color="error"> *</Typography>
                  )}
                </Typography>
              )}
              {currentQuestion.type === "contact" && (
                <Typography variant="body1" fontWeight={500}>
                  Želite li da vas kontaktiramo vezano uz vaš komentar?
                </Typography>
              )}
              <QuestionRenderer
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                setAnswer={(val) =>
                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))
                }
              />
            </Stack>
          )}

          <Stack direction="row" justifyContent="space-between" gap={2}>
            <Button
              variant="text"
              onClick={onClose}
              sx={{ borderRadius: 2 }}
            >
              Preskoci
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              sx={{ borderRadius: 2, flex: 1 }}
            >
              {loading
                ? "Šalje se..."
                : currentIdx < questions.length - 1
                ? "Dalje"
                : "Pošalji"}
            </Button>
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
};

export default SurveyDrawer;
```

- [ ] **Step 2: Commit**

```bash
git add src/views/rooms/details/components/SurveyDrawer.tsx
git commit -m "feat: add SurveyDrawer component for guest survey flow"
```

---

## Task 11: App — Update FeedbackDrawer — dodaj "Odgovori detaljnije" gumb

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/views/rooms/details/components/FeedbackDrawer.tsx`

Nakon što gost pošalje 1-3 feedback, ako je `room.survey?.isActive` i ima pitanja, prikaži "Odgovori detaljnije" gumb koji otvara SurveyDrawer.

- [ ] **Step 1: Dodaj survey state i SurveyDrawer import**

Na vrhu fajla dodaj:

```tsx
import SurveyDrawer from "./SurveyDrawer";
```

U `FeedbackDrawer` komponenti dodaj state:

```tsx
const [showSurvey, setShowSurvey] = useState(false);
const [submittedEmail, setSubmittedEmail] = useState("");
const [submittedMessage, setSubmittedMessage] = useState("");
const [submittedRating, setSubmittedRating] = useState(0);
```

- [ ] **Step 2: Prilagodi handleFeedbackSubmit u FeedbackDrawer**

Pronađi `handleFeedbackSubmit` callback. Promijeni ga da sprema podatke umjesto da odmah zatvori:

```tsx
const handleFeedbackSubmit = useCallback(
  async (email: string, message: string) => {
    const success = await saveFeedback(rating, email, message);
    if (success) {
      const surveyActive =
        room.survey?.isActive &&
        (room.survey?.questions ?? []).length > 0;
      if (surveyActive) {
        setSubmittedEmail(email);
        setSubmittedMessage(message);
        setSubmittedRating(rating);
        // Ne zatvaramo - prelazimo na survey step
        setStep("survey" as any);
      } else {
        onClose();
      }
    }
  },
  [saveFeedback, rating, onClose, room.survey]
);
```

- [ ] **Step 3: Dodaj "survey" step u FeedbackStep komponentu**

U `FeedbackStep`, iza "Submit Feedback" gumba, dodaj uvjetni gumb (prikazan samo ako survey aktivan):

```tsx
{room.survey?.isActive && (room.survey?.questions ?? []).length > 0 && (
  <Button
    variant="outlined"
    onClick={() => onDetailedFeedback?.(email.trim(), message.trim())}
    sx={{ borderRadius: 2, mt: 1 }}
  >
    {room.survey?.buttonText || "Odgovori detaljnije"}
  </Button>
)}
```

Dodaj `onDetailedFeedback?: (email: string, message: string) => void` u `FeedbackStep` props interface.

- [ ] **Step 4: Dodaj survey rendering u return bloku FeedbackDrawer-a**

U return bloku, iza `{step === "google" && ...}`, dodaj:

```tsx
{step === ("survey" as any) && showSurvey === false && (
  <Stack spacing={3} alignItems="center">
    <Typography variant="h6" fontWeight="bold" textAlign="center">
      Hvala na feedbacku!
    </Typography>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      Ako želite, možete nam odgovoriti na nekoliko kratkih pitanja.
    </Typography>
    <Button
      variant="contained"
      onClick={() => setShowSurvey(true)}
      sx={{ borderRadius: 2, width: "100%" }}
    >
      {room.survey?.buttonText || "Odgovori detaljnije"}
    </Button>
    <Button variant="text" onClick={onClose} sx={{ borderRadius: 2 }}>
      Preskoci
    </Button>
  </Stack>
)}
```

I na dnu, IZVAN Drawer-a, dodaj uvjetni SurveyDrawer:

```tsx
{showSurvey && (
  <SurveyDrawer
    room={room}
    onClose={() => {
      setShowSurvey(false);
      onClose();
    }}
    prefillRating={submittedRating}
    prefillEmail={submittedEmail}
    prefillMessage={submittedMessage}
  />
)}
```

**Napomena:** Kad je survey aktivan i gost klikne "Odgovori detaljnije", NE šaljemo feedback ponovo — survey šalje novi zapis s `surveyAnswers`. Ako `prefillRating` postoji, šalje se kombinovano.

- [ ] **Step 5: Commit**

```bash
git add src/views/rooms/details/components/FeedbackDrawer.tsx
git commit -m "feat: add 'Odgovori detaljnije' survey button to FeedbackDrawer"
```

---

## Task 12: App — Dodaj SurveyButton u RoomView (standalone button mode)

**Files:**
- Modify: `infiora-app-main/infiora-app-main/src/views/rooms/details/components/RoomView.tsx`

- [ ] **Step 1: Uvezi surveyDialog i SurveyDrawer**

Na vrhu RoomView.tsx, dodaj import:

```tsx
import SurveyDrawer from "./SurveyDrawer";
```

Iz `useRoom()` destructure-aj i `surveyDialog`:

```tsx
const {
  language,
  setLanguage,
  activityId,
  isDialogOpen,
  blogDialog,
  popupDialog,
  newsletterDialog,
  feedbackDialog,
  surveyDialog,   // <-- dodaj
} = useRoom();
```

- [ ] **Step 2: Dodaj SurveyButton u JSX (pored NewsletterButton)**

Pronađi blok gdje se renderira newsletter button (oko linije 332 originala):

```tsx
{room.survey?.isActive &&
  room.survey?.type === "button" &&
  !isNullOrEmpty(room.survey?.mainButtonText) && (
    <Button
      variant="outlined"
      onClick={surveyDialog.open}
      sx={{ borderRadius: 2, my: 1 }}
    >
      {room.survey.mainButtonText}
    </Button>
  )}
```

Postavi ga odmah iza newsletter button bloka.

- [ ] **Step 3: Dodaj SurveyDrawer renderiranje**

Pronađi gdje se renderira `{feedbackDialog.isOpen && <FeedbackDrawer ... />}`. Odmah iza dodaj:

```tsx
{surveyDialog.isOpen && (
  <SurveyDrawer room={room} onClose={surveyDialog.close} />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/views/rooms/details/components/RoomView.tsx
git commit -m "feat: add standalone SurveyButton to RoomView for button mode"
```

---

## Self-Review Checklist

### Spec coverage
- [x] FeedbackTab split na 2 sekcije → Task 7
- [x] Survey builder sa 8 tipova pitanja → Task 6
- [x] Gost vidi "Odgovori detaljnije" na 1-3 → Task 11
- [x] Standalone button mode (kao newsletter) → Task 12
- [x] surveyAnswers čuvaju se u Feedback modelu → Task 4
- [x] /feedbacks prikazuje survey odgovore → Task 8
- [x] Per-soba/per-grup survey (ne hotel-level) → pattern slijedi room/group model
- [x] Backend model + validacija za room → Task 1 + 3
- [x] Backend model + validacija za group → Task 2 + 3
- [x] App types + context → Task 9

### Potencijalni problemi
- `uuid` paket: Task 6 Step 2 provjerava i instalira ako treba
- `SurveyDrawer` šalje novi feedback zapis (ne modificira postojeći) — korektan pristup jer mogu biti nezavisni survey odgovori bez ratinga (standalone button mode)
- Tip `"survey"` u FeedbackDrawer step type-u: koristi cast `as any` da izbjegnemo proširivanje union tipa u vanjskoj komponenti; prihvatljivo rješenje
