import React, { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Box, Button, Card, CardContent, Divider, Grid, IconButton,
  MenuItem, Select, Stack, TextField, Typography, useTheme
} from '@mui/material'
import { Add, Delete, DragIndicator } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import { toast } from 'react-toastify'
import IconPicker from 'react-icons-picker'

import { useUpdateRoomJsonMutation } from '@/redux/api/roomApi'
import { useUpdateGroupJsonMutation } from '@/redux/api/groupApi'
import type { IGroup, ILink, IRoom, ISurvey, ISurveyQuestion } from '@/types'
import ImagePicker from '@/components/widgets/ImagePicker'
import { useDictionary } from '@/contexts/DictionaryContext'
import RoomPreview from '@/views/shared/RoomPreview'

const QUESTION_TYPES = [
  { value: 'rating',        label: 'Rating (1-5 zvjezdica)' },
  { value: 'yes_no',        label: 'Da / Ne' },
  { value: 'single_choice', label: 'Jedan odgovor (višestruki izbor)' },
  { value: 'multi_choice',  label: 'Više odgovora odjednom' },
  { value: 'open_text',     label: 'Otvoreno pitanje (svojim riječima)' },
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
  noPreview?: boolean
  onSurveyChange?: (survey: ISurvey) => void
}

const SurveyTab: React.FC<SurveyTabProps> = ({ room, group, links, noPreview, onSurveyChange }) => {
  const s = room || group
  const dictionary = useDictionary()
  const theme = useTheme()

  const [updateRoomJson, { isLoading: isUpdatingRoom }] = useUpdateRoomJsonMutation()
  const [updateGroupJson, { isLoading: isUpdatingGroup }] = useUpdateGroupJsonMutation()

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

  useEffect(() => {
    onSurveyChange?.(survey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey])

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
        await updateRoomJson({ id: room.id, data: { survey } }).unwrap()
        toast.success(dictionary.messages.updateRoomSuccess)
      } else if (group) {
        await updateGroupJson({ id: group.id, data: { survey } }).unwrap()
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

  const editorContent = (
    <form noValidate autoComplete='off' style={{ flex: 1 }}>
      <Stack gap={0} flex={1} height={noPreview ? undefined : { md: 550 }} sx={{ position: noPreview ? 'static' : 'relative' }}>
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
          sx={{ overflowY: noPreview ? 'visible' : 'auto', scrollbarWidth: 'none', mt: 2, pb: noPreview ? 2 : 20 }}
        >
          {/* Type: popup or button */}
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
            <Typography variant='subtitle1' fontWeight={600}>
              Pitanja ({(survey.questions ?? []).length})
            </Typography>
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

                    {/* Options for single_choice and multi_choice */}
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

                    {/* Matrix rows and columns */}
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

        {/* Bottom action bar: Add question + Cancel + Save */}
        <Stack sx={noPreview ? undefined : { position: 'absolute', zIndex: 10, bottom: 0, width: '100%' }}>
          {!noPreview && (
            <Box
              sx={{
                height: 50,
                width: '100%',
                background: `linear-gradient(transparent, ${theme.palette.background.default})`,
              }}
            />
          )}
          <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            gap={2}
            sx={noPreview ? { mt: 2 } : { background: theme.palette.background.default }}
          >
            <Button startIcon={<Add />} variant='outlined' size='small' onClick={addQuestion}>
              Dodaj pitanje
            </Button>
            <Stack direction='row' gap={2}>
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
      </Stack>
    </form>
  )

  if (noPreview) {
    return editorContent
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
      {editorContent}
      <Divider orientation='vertical' flexItem />
      <RoomPreview room={{ ...s, survey }} links={links} />
    </Stack>
  )
}

export default SurveyTab
