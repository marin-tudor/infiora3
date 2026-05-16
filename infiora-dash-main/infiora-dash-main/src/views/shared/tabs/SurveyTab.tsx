import React, { useEffect, useState } from 'react'

import { Add, Delete, DragIndicator } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { toast } from 'react-toastify'
import IconPicker from 'react-icons-picker'

import { useDictionary } from '@/contexts/DictionaryContext'
import { useUpdateGroupJsonMutation } from '@/redux/api/groupApi'
import { useUpdateRoomJsonMutation } from '@/redux/api/roomApi'
import type { IGroup, ILink, IRoom, ISurvey, ISurveyQuestion } from '@/types'
import ImagePicker from '@/components/widgets/ImagePicker'
import RoomPreview from '@/views/shared/RoomPreview'

const QUESTION_TYPES = [
  { value: 'rating', label: 'Rating (1-5 zvjezdica)' },
  { value: 'yes_no', label: 'Da / Ne' },
  { value: 'single_choice', label: 'Jedan odgovor (visestruki izbor)' },
  { value: 'multi_choice', label: 'Vise odgovora odjednom' },
  { value: 'open_text', label: 'Otvoreno pitanje (svojim rijecima)' },
  { value: 'nps', label: 'NPS pitanje (0-10)' },
  { value: 'matrix', label: 'Matrica pitanja (vise stavki)' },
  { value: 'contact', label: 'Kontakt (opcionalni email/telefon)' }
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
  const subject = room || group
  const dictionary = useDictionary()
  const [updateRoomJson, { isLoading: isUpdatingRoom }] = useUpdateRoomJsonMutation()
  const [updateGroupJson, { isLoading: isUpdatingGroup }] = useUpdateGroupJsonMutation()

  const initSurvey = (): ISurvey => ({
    isActive: subject?.survey?.isActive ?? false,
    type: subject?.survey?.type ?? 'popup',
    buttonText: subject?.survey?.buttonText ?? '',
    mainButtonText: subject?.survey?.mainButtonText ?? '',
    imageType: subject?.survey?.imageType ?? 'none',
    image: subject?.survey?.image ?? '',
    questions: subject?.survey?.questions ?? []
  })

  const [survey, setSurvey] = useState<ISurvey>(initSurvey)

  useEffect(() => {
    onSurveyChange?.(survey)
  }, [onSurveyChange, survey])

  const addQuestion = () => {
    const newQuestion: ISurveyQuestion = {
      id: crypto.randomUUID(),
      type: 'rating',
      text: '',
      options: [],
      matrixRows: [],
      matrixColumns: [],
      required: false
    }

    setSurvey(previous => ({ ...previous, questions: [...(previous.questions ?? []), newQuestion] }))
  }

  const updateQuestion = (id: string, patch: Partial<ISurveyQuestion>) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question => (question.id === id ? { ...question, ...patch } : question))
    }))
  }

  const removeQuestion = (id: string) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).filter(question => question.id !== id)
    }))
  }

  const addOption = (questionId: string) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question =>
        question.id === questionId ? { ...question, options: [...(question.options ?? []), ''] } : question
      )
    }))
  }

  const updateOption = (questionId: string, index: number, value: string) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question => {
        if (question.id !== questionId) {
          return question
        }

        const options = [...(question.options ?? [])]

        options[index] = value

        return { ...question, options }
      })
    }))
  }

  const removeOption = (questionId: string, index: number) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question => {
        if (question.id !== questionId) {
          return question
        }

        const options = [...(question.options ?? [])]

        options.splice(index, 1)

        return { ...question, options }
      })
    }))
  }

  const addMatrixRow = (questionId: string) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question =>
        question.id === questionId ? { ...question, matrixRows: [...(question.matrixRows ?? []), ''] } : question
      )
    }))
  }

  const updateMatrixRow = (questionId: string, index: number, value: string) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question => {
        if (question.id !== questionId) {
          return question
        }

        const matrixRows = [...(question.matrixRows ?? [])]

        matrixRows[index] = value

        return { ...question, matrixRows }
      })
    }))
  }

  const removeMatrixRow = (questionId: string, index: number) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question => {
        if (question.id !== questionId) {
          return question
        }

        const matrixRows = [...(question.matrixRows ?? [])]

        matrixRows.splice(index, 1)

        return { ...question, matrixRows }
      })
    }))
  }

  const addMatrixColumn = (questionId: string) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question =>
        question.id === questionId ? { ...question, matrixColumns: [...(question.matrixColumns ?? []), ''] } : question
      )
    }))
  }

  const updateMatrixColumn = (questionId: string, index: number, value: string) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question => {
        if (question.id !== questionId) {
          return question
        }

        const matrixColumns = [...(question.matrixColumns ?? [])]

        matrixColumns[index] = value

        return { ...question, matrixColumns }
      })
    }))
  }

  const removeMatrixColumn = (questionId: string, index: number) => {
    setSurvey(previous => ({
      ...previous,
      questions: (previous.questions ?? []).map(question => {
        if (question.id !== questionId) {
          return question
        }

        const matrixColumns = [...(question.matrixColumns ?? [])]

        matrixColumns.splice(index, 1)

        return { ...question, matrixColumns }
      })
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
    if (survey.imageType === 'icon') {
      return (
        <Stack gap={1}>
          <Typography variant='body2'>Icon</Typography>
          <Stack direction='row' alignItems='center' gap={2}>
            <IconPicker value={survey.image || 'TiCancel'} onChange={(value: string) => setSurvey(previous => ({ ...previous, image: value }))} />
            {survey.image && (
              <Button color='error' onClick={() => setSurvey(previous => ({ ...previous, image: '' }))}>
                {dictionary.remove}
              </Button>
            )}
          </Stack>
        </Stack>
      )
    }

    if (survey.imageType === 'image') {
      return (
        <ImagePicker
          id='survey-image'
          label='Image'
          description=''
          image={survey.image}
          setImage={(value: string) => setSurvey(previous => ({ ...previous, image: value }))}
        />
      )
    }

    if (survey.imageType === 'url') {
      return (
        <TextField
          variant='standard'
          size='small'
          InputLabelProps={{ shrink: true }}
          label='Image URL'
          value={survey.image}
          onChange={event => setSurvey(previous => ({ ...previous, image: event.target.value }))}
          fullWidth
        />
      )
    }

    return null
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
            <Box component='label' sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type='checkbox'
                checked={survey.isActive ?? false}
                onChange={event => setSurvey(previous => ({ ...previous, isActive: event.target.checked }))}
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
                    transition: 'left 0.2s'
                  }
                }}
              />
            </Box>
          </Stack>
        </Stack>

        <Grid container spacing={2} sx={{ overflowY: noPreview ? 'visible' : 'auto', scrollbarWidth: 'none', mt: 2, pb: noPreview ? 2 : 20 }}>
          <Grid item xs={12}>
            <Stack gap={1}>
              <Typography variant='body2'>Tip prikaza</Typography>
              <Stack direction='row' gap={1}>
                {(['popup', 'button'] as const).map(type => (
                  <Button
                    key={type}
                    variant={survey.type === type ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() => setSurvey(previous => ({ ...previous, type }))}
                  >
                    {type === 'popup' ? 'Popup' : 'Button'}
                  </Button>
                ))}
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <TextField
              variant='standard'
              size='small'
              InputLabelProps={{ shrink: true }}
              label='Tekst gumba u popupu (npr. "Odgovori detaljnije")'
              value={survey.buttonText ?? ''}
              onChange={event => setSurvey(previous => ({ ...previous, buttonText: event.target.value }))}
              fullWidth
            />
          </Grid>

          {survey.type === 'button' && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant='h6' sx={{ mb: 2 }}>
                    Button Settings
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        variant='standard'
                        size='small'
                        InputLabelProps={{ shrink: true }}
                        label='Tekst standalone gumba'
                        value={survey.mainButtonText ?? ''}
                        onChange={event => setSurvey(previous => ({ ...previous, mainButtonText: event.target.value }))}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack gap={1}>
                        <Typography variant='body2'>Image Type</Typography>
                        <Stack direction='row' gap={1}>
                          {(['none', 'icon', 'image', 'url'] as const).map(type => (
                            <Button
                              key={type}
                              variant={survey.imageType === type ? 'contained' : 'outlined'}
                              size='small'
                              onClick={() => setSurvey(previous => ({ ...previous, imageType: type, image: '' }))}
                            >
                              {type}
                            </Button>
                          ))}
                        </Stack>
                      </Stack>
                    </Grid>
                    {survey.imageType !== 'none' && <Grid item xs={12}>{renderImagePicker()}</Grid>}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant='subtitle1' fontWeight={600}>
              Pitanja ({(survey.questions ?? []).length})
            </Typography>
          </Grid>

          {(survey.questions ?? []).map((question, questionIndex) => (
            <Grid item xs={12} key={question.id}>
              <Card variant='outlined'>
                <CardContent>
                  <Stack gap={2}>
                    <Stack direction='row' alignItems='center' gap={1}>
                      <DragIndicator sx={{ color: 'text.disabled', cursor: 'grab' }} />
                      <Typography variant='body2' color='text.secondary'>
                        #{questionIndex + 1}
                      </Typography>
                      <Select
                        size='small'
                        value={question.type}
                        onChange={event =>
                          updateQuestion(question.id, {
                            type: event.target.value as ISurveyQuestion['type'],
                            options: [],
                            matrixRows: [],
                            matrixColumns: []
                          })
                        }
                        sx={{ minWidth: 220 }}
                      >
                        {QUESTION_TYPES.map(questionType => (
                          <MenuItem key={questionType.value} value={questionType.value}>
                            {questionType.label}
                          </MenuItem>
                        ))}
                      </Select>
                      <Box flex={1} />
                      <IconButton size='small' color='error' onClick={() => removeQuestion(question.id)}>
                        <Delete />
                      </IconButton>
                    </Stack>

                    {question.type !== 'contact' && (
                      <TextField
                        variant='standard'
                        size='small'
                        InputLabelProps={{ shrink: true }}
                        label='Tekst pitanja'
                        value={question.text}
                        onChange={event => updateQuestion(question.id, { text: event.target.value })}
                        fullWidth
                      />
                    )}

                    {needsOptions(question.type) && (
                      <Stack gap={1}>
                        <Typography variant='body2' color='text.secondary'>
                          Ponudeni odgovori
                        </Typography>
                        {(question.options ?? []).map((option, optionIndex) => (
                          <Stack key={optionIndex} direction='row' alignItems='center' gap={1}>
                            <TextField
                              variant='standard'
                              size='small'
                              value={option}
                              onChange={event => updateOption(question.id, optionIndex, event.target.value)}
                              placeholder={`Odgovor ${optionIndex + 1}`}
                              fullWidth
                            />
                            <IconButton size='small' onClick={() => removeOption(question.id, optionIndex)}>
                              <Delete fontSize='small' />
                            </IconButton>
                          </Stack>
                        ))}
                        <Button startIcon={<Add />} size='small' onClick={() => addOption(question.id)} sx={{ alignSelf: 'flex-start' }}>
                          Dodaj odgovor
                        </Button>
                      </Stack>
                    )}

                    {needsMatrix(question.type) && (
                      <Stack gap={2}>
                        <Stack gap={1}>
                          <Typography variant='body2' color='text.secondary'>
                            Redovi (stavke)
                          </Typography>
                          {(question.matrixRows ?? []).map((row, rowIndex) => (
                            <Stack key={rowIndex} direction='row' alignItems='center' gap={1}>
                              <TextField
                                variant='standard'
                                size='small'
                                value={row}
                                onChange={event => updateMatrixRow(question.id, rowIndex, event.target.value)}
                                placeholder={`Stavka ${rowIndex + 1}`}
                                fullWidth
                              />
                              <IconButton size='small' onClick={() => removeMatrixRow(question.id, rowIndex)}>
                                <Delete fontSize='small' />
                              </IconButton>
                            </Stack>
                          ))}
                          <Button startIcon={<Add />} size='small' onClick={() => addMatrixRow(question.id)} sx={{ alignSelf: 'flex-start' }}>
                            Dodaj stavku
                          </Button>
                        </Stack>

                        <Stack gap={1}>
                          <Typography variant='body2' color='text.secondary'>
                            Kolone (opcije ocjenjivanja)
                          </Typography>
                          {(question.matrixColumns ?? []).map((column, columnIndex) => (
                            <Stack key={columnIndex} direction='row' alignItems='center' gap={1}>
                              <TextField
                                variant='standard'
                                size='small'
                                value={column}
                                onChange={event => updateMatrixColumn(question.id, columnIndex, event.target.value)}
                                placeholder={`Kolona ${columnIndex + 1}`}
                                fullWidth
                              />
                              <IconButton size='small' onClick={() => removeMatrixColumn(question.id, columnIndex)}>
                                <Delete fontSize='small' />
                              </IconButton>
                            </Stack>
                          ))}
                          <Button
                            startIcon={<Add />}
                            size='small'
                            onClick={() => addMatrixColumn(question.id)}
                            sx={{ alignSelf: 'flex-start' }}
                          >
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

        <Stack sx={noPreview ? undefined : { position: 'absolute', zIndex: 10, bottom: 0, width: '100%' }}>
          {!noPreview && <Box sx={{ height: 50, width: '100%', background: 'linear-gradient(transparent, white)' }} />}
          <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            gap={2}
            sx={noPreview ? { mt: 2 } : { background: 'background.default' }}
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
      <RoomPreview room={{ ...subject, survey }} links={links} />
    </Stack>
  )
}

export default SurveyTab
