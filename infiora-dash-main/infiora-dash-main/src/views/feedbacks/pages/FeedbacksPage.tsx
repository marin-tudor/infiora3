'use client'

import { useMemo, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { endOfToday, startOfToday } from 'date-fns'

import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ClearIcon from '@mui/icons-material/Clear'
import EmailIcon from '@mui/icons-material/Email'
import FeedbackIcon from '@mui/icons-material/Feedback'
import PollIcon from '@mui/icons-material/Poll'
import StarIcon from '@mui/icons-material/Star'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'

import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import Loader from '@/components/common/Loader'
import RangePicker from '@/components/common/RangePicker'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelFeedbacksQuery } from '@/redux/api/roomApi'
import type { IFeedbackSubmission, IRoom } from '@/types'
import { toSearchParams } from '@/utils/miscUtils'
import RoomsDropdown from '@/views/shared/RoomsDropdown'
import FeedbacksTable from '@/views/feedbacks/components/FeedbacksTable'

export interface QuestionFilter {
  questionId: string | null
  questionType: string
  selectedValues: string[]
  textValue: string
}

const KpiCard = ({
  icon,
  label,
  value,
  color = 'primary.main'
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color?: string
}) => (
  <Card variant='outlined' sx={{ flex: 1, minWidth: 140 }}>
    <CardContent sx={{ py: '12px !important', px: 2 }}>
      <Stack direction='row' alignItems='center' gap={1.5}>
        <Avatar sx={{ bgcolor: color, width: 36, height: 36 }}>{icon}</Avatar>
        <Stack>
          <Typography variant='h6' fontWeight={700} lineHeight={1}>
            {value}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {label}
          </Typography>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const starLabel = (count: number) => '*'.repeat(count) + '-'.repeat(5 - count)

const hasAnyEmail = (submission: IFeedbackSubmission) => {
  if (submission.email) {
    return true
  }

  return (
    submission.surveyAnswers?.some(
      answer =>
        answer.questionType === 'contact' &&
        typeof answer.answer === 'object' &&
        answer.answer !== null &&
        !Array.isArray(answer.answer) &&
        (answer.answer.email || answer.answer.phone)
    ) ?? false
  )
}

const FeedbacksPage = ({ rooms }: { rooms: IRoom[] }) => {
  const dictionary = useDictionary()
  const authUser = useAuthUser()
  const router = useRouter()
  const { lang: locale } = useParams()
  const searchParams: any = useSearchQuery(['startDate', 'endDate'])

  const [selectedRoom, setSelectedRoom] = useState<IRoom>()
  const [minRating, setMinRating] = useState(0)
  const [typeFilter, setTypeFilter] = useState<'all' | 'review' | 'survey'>('all')

  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>({
    questionId: null,
    questionType: '',
    selectedValues: [],
    textValue: ''
  })

  const start = useMemo(() => startOfToday(), [])
  const end = useMemo(() => endOfToday(), [])

  const { data: allData, isLoading: allLoading } = useGetHotelFeedbacksQuery(
    authUser?.hotel?.id
      ? {
          hotel: authUser.hotel.id,
          startDate: searchParams.startDate || start.toISOString(),
          endDate: searchParams.endDate || end.toISOString(),
          limit: 1000
        }
      : undefined,
    { skip: !authUser?.hotel?.id }
  )

  const stats = useMemo(() => {
    const results = (allData?.results as IFeedbackSubmission[]) ?? []
    const total = results.length
    const rated = results.filter(item => item.rating && item.rating > 0)

    const avgRating =
      rated.length > 0 ? (rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length).toFixed(1) : '-'

    return {
      total,
      avgRating,
      withSurvey: results.filter(item => item.surveyAnswers && item.surveyAnswers.length > 0).length,
      withEmail: results.filter(hasAnyEmail).length
    }
  }, [allData])

  const allQuestions = useMemo(() => {
    const results = (allData?.results as IFeedbackSubmission[]) ?? []
    const seen = new Map<string, { id: string; text: string; type: string; options: Set<string> }>()

    results.forEach(submission => {
      submission.surveyAnswers?.forEach(answer => {
        if (!answer.questionId) {
          return
        }

        if (!seen.has(answer.questionId)) {
          seen.set(answer.questionId, {
            id: answer.questionId,
            text: answer.questionText,
            type: answer.questionType ?? '',
            options: new Set()
          })
        }

        const entry = seen.get(answer.questionId)!
        const value = answer.answer

        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(option => entry.options.add(String(option)))
          } else if (typeof value !== 'object') {
            entry.options.add(String(value))
          }
        }
      })
    })

    return Array.from(seen.values()).map(question => ({
      ...question,
      options: Array.from(question.options).sort()
    }))
  }, [allData])

  const roomPerformance = useMemo(() => {
    const results = (allData?.results as IFeedbackSubmission[]) ?? []
    const grouped: Record<string, { number: string; count: number; ratingTotal: number; ratingCount: number; withSurvey: number }> = {}

    results.forEach(submission => {
      const roomId = typeof submission.room === 'object' ? submission.room.id : String(submission.room)
      const roomNumber = typeof submission.room === 'object' ? submission.room.number : String(submission.room)

      if (!grouped[roomId]) {
        grouped[roomId] = { number: roomNumber, count: 0, ratingTotal: 0, ratingCount: 0, withSurvey: 0 }
      }

      grouped[roomId].count += 1

      if (submission.rating && submission.rating > 0) {
        grouped[roomId].ratingTotal += submission.rating
        grouped[roomId].ratingCount += 1
      }

      if (submission.surveyAnswers && submission.surveyAnswers.length > 0) {
        grouped[roomId].withSurvey += 1
      }
    })

    return Object.entries(grouped)
      .map(([id, value]) => ({
        id,
        number: value.number,
        count: value.count,
        avgRating: value.ratingCount > 0 ? value.ratingTotal / value.ratingCount : null,
        withSurvey: value.withSurvey
      }))
      .sort((left, right) => {
        if (left.avgRating === null && right.avgRating === null) {
          return 0
        }

        if (left.avgRating === null) {
          return 1
        }

        if (right.avgRating === null) {
          return -1
        }

        return left.avgRating - right.avgRating
      })
  }, [allData])

  if (!authUser || !authUser.hotel) {
    return <Loader center />
  }

  const selectedQuestion = allQuestions.find(question => question.id === questionFilter.questionId)

  const hasActiveQuestionFilter =
    questionFilter.questionId !== null &&
    (questionFilter.selectedValues.length > 0 || questionFilter.textValue.trim() !== '')

  const clearQuestionFilter = () => {
    setQuestionFilter({ questionId: null, questionType: '', selectedValues: [], textValue: '' })
  }

  const toggleAnswerValue = (value: string) => {
    setQuestionFilter(previous => ({
      ...previous,
      selectedValues: previous.selectedValues.includes(value)
        ? previous.selectedValues.filter(entry => entry !== value)
        : [...previous.selectedValues, value]
    }))
  }

  const answerOptions =
    questionFilter.questionType === 'yes_no'
      ? ['yes', 'no']
      : questionFilter.questionType === 'rating'
        ? ['1', '2', '3', '4', '5']
        : (selectedQuestion?.options ?? [])

  return (
    <Stack gap={4}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} gap={2}>
        <Typography variant='h4'>{dictionary.feedbacks}</Typography>
        <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
          <RoomsDropdown rooms={rooms} selectedRoom={selectedRoom} setSelectedRoom={setSelectedRoom} />
          <RangePicker
            range={{ startDate: searchParams.startDate, endDate: searchParams.endDate }}
            setRange={({ startDate, endDate }) =>
              router.push(`/${locale}/feedbacks?` + toSearchParams({ ...searchParams, startDate, endDate }))
            }
          />
        </Stack>
      </Stack>

      {allLoading ? (
        <Loader center />
      ) : (
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} flexWrap='wrap'>
          <KpiCard icon={<FeedbackIcon fontSize='small' />} label={dictionary.totalFeedbacks} value={stats.total} />
          <KpiCard
            icon={<StarIcon fontSize='small' />}
            label={dictionary.averageRating}
            value={stats.avgRating}
            color='warning.main'
          />
          <KpiCard
            icon={<PollIcon fontSize='small' />}
            label={dictionary.withSurvey}
            value={stats.withSurvey}
            color='secondary.main'
          />
          <KpiCard
            icon={<EmailIcon fontSize='small' />}
            label={dictionary.withEmail}
            value={stats.withEmail}
            color='success.main'
          />
        </Stack>
      )}

      <Stack gap={2}>
        <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
          <Typography
            variant='caption'
            color='text.secondary'
            fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 70 }}
          >
            {dictionary.rating}:
          </Typography>
          {[0, 1, 2, 3, 4, 5].map(value => (
            <Chip
              key={value}
              label={value === 0 ? dictionary.allRatings : starLabel(value)}
              size='small'
              variant={minRating === value ? 'filled' : 'outlined'}
              color={minRating === value ? 'primary' : 'default'}
              onClick={() => setMinRating(value)}
              sx={{ fontFamily: 'monospace', cursor: 'pointer' }}
            />
          ))}
        </Stack>

        <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
          <Typography
            variant='caption'
            color='text.secondary'
            fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 70 }}
          >
            {dictionary.feedbackType}:
          </Typography>
          {(['all', 'review', 'survey'] as const).map(value => (
            <Chip
              key={value}
              label={
                value === 'all' ? dictionary.allTypes : value === 'review' ? dictionary.reviewOnly : dictionary.surveyOnly
              }
              size='small'
              variant={typeFilter === value ? 'filled' : 'outlined'}
              color={typeFilter === value ? 'primary' : 'default'}
              onClick={() => setTypeFilter(value)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Stack>

        {allQuestions.length > 0 && (
          <Stack gap={1.5}>
            <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
              <Typography
                variant='caption'
                color='text.secondary'
                fontWeight={600}
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 70 }}
              >
                {dictionary.question}:
              </Typography>
              <Select
                size='small'
                value={questionFilter.questionId ?? ''}
                onChange={event => {
                  const question = allQuestions.find(entry => entry.id === event.target.value)

                  setQuestionFilter({
                    questionId: question?.id ?? null,
                    questionType: question?.type ?? '',
                    selectedValues: [],
                    textValue: ''
                  })
                }}
                displayEmpty
                sx={{ minWidth: 220, fontSize: 13 }}
              >
                <MenuItem value=''>{dictionary.allTypes}</MenuItem>
                {allQuestions.map(question => (
                  <MenuItem key={question.id} value={question.id} sx={{ fontSize: 13 }}>
                    {question.text}
                  </MenuItem>
                ))}
              </Select>
              {questionFilter.questionId && (
                <IconButton size='small' onClick={clearQuestionFilter} title='Clear question filter'>
                  <ClearIcon fontSize='small' />
                </IconButton>
              )}
            </Stack>

            {questionFilter.questionId && (
              <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  fontWeight={600}
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 70 }}
                >
                  {dictionary.answer}:
                </Typography>

                {questionFilter.questionType === 'open_text' ? (
                  <TextField
                    size='small'
                    placeholder='Contains...'
                    value={questionFilter.textValue}
                    onChange={event => setQuestionFilter(previous => ({ ...previous, textValue: event.target.value }))}
                    sx={{ minWidth: 200, fontSize: 13 }}
                    InputProps={{ sx: { fontSize: 13 } }}
                  />
                ) : (
                  answerOptions.map(option => {
                    const isActive = questionFilter.selectedValues.includes(option)
                    let label = option

                    if (questionFilter.questionType === 'rating') {
                      label = starLabel(Number(option))
                    } else if (questionFilter.questionType === 'yes_no') {
                      label = option === 'yes' ? 'Yes' : 'No'
                    } else if (questionFilter.questionType === 'nps') {
                      label = `NPS ${option}`
                    }

                    return (
                      <Chip
                        key={option}
                        label={label}
                        size='small'
                        variant={isActive ? 'filled' : 'outlined'}
                        color={isActive ? 'secondary' : 'default'}
                        onClick={() => toggleAnswerValue(option)}
                        sx={{
                          cursor: 'pointer',
                          fontFamily: questionFilter.questionType === 'rating' ? 'monospace' : 'inherit'
                        }}
                      />
                    )
                  })
                )}

                {hasActiveQuestionFilter && (
                  <Chip
                    label='Clear'
                    size='small'
                    variant='filled'
                    color='error'
                    onClick={() => setQuestionFilter(previous => ({ ...previous, selectedValues: [], textValue: '' }))}
                    sx={{ cursor: 'pointer' }}
                  />
                )}
              </Stack>
            )}
          </Stack>
        )}
      </Stack>

      <FeedbacksTable
        hotel={authUser.hotel.id}
        room={selectedRoom?.id}
        minRating={minRating}
        typeFilter={typeFilter}
        questionFilter={questionFilter}
      />

      {roomPerformance.length > 0 && (
        <Stack gap={2}>
          <Stack direction='row' alignItems='center' gap={1}>
            <TrendingDownIcon color='error' />
            <Typography variant='h6'>{dictionary.roomPerformance}</Typography>
            <Typography variant='caption' color='text.secondary'>
              (sorted by lowest rating first)
            </Typography>
          </Stack>
          <Card variant='outlined'>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{dictionary.room}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{dictionary.submissions}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{dictionary.avgRating}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{dictionary.withSurvey}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roomPerformance.map(roomPerformanceItem => {
                  const ratingColor =
                    roomPerformanceItem.avgRating === null
                      ? 'text.secondary'
                      : roomPerformanceItem.avgRating < 3
                        ? 'error.main'
                        : roomPerformanceItem.avgRating < 4
                          ? 'warning.main'
                          : 'success.main'

                  return (
                    <TableRow
                      key={roomPerformanceItem.id}
                      hover
                      sx={roomPerformanceItem.avgRating !== null && roomPerformanceItem.avgRating < 3 ? { bgcolor: 'error.50' } : {}}
                    >
                      <TableCell>
                        <Stack direction='row' alignItems='center' gap={1}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: 12, fontWeight: 700 }}>
                            {String(roomPerformanceItem.number).slice(0, 2)}
                          </Avatar>
                          <Typography variant='body2' fontWeight={500}>
                            {roomPerformanceItem.number}
                          </Typography>
                          {roomPerformanceItem.avgRating !== null && roomPerformanceItem.avgRating < 3 && (
                            <Chip label='Low' size='small' color='error' variant='filled' sx={{ height: 18, fontSize: 10 }} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{roomPerformanceItem.count}</Typography>
                      </TableCell>
                      <TableCell>
                        {roomPerformanceItem.avgRating !== null ? (
                          <Stack direction='row' alignItems='center' gap={0.5}>
                            <StarIcon sx={{ fontSize: 16, color: '#FFD54F' }} />
                            <Typography variant='body2' fontWeight={600} color={ratingColor}>
                              {roomPerformanceItem.avgRating.toFixed(1)}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{roomPerformanceItem.withSurvey}</Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </Stack>
      )}
    </Stack>
  )
}

export default FeedbacksPage
