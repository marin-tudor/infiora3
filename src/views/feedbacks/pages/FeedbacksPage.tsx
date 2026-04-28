'use client'

import { useMemo, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'
import { endOfToday, startOfToday } from 'date-fns'

import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import PollIcon from '@mui/icons-material/Poll'
import EmailIcon from '@mui/icons-material/Email'
import FeedbackIcon from '@mui/icons-material/Feedback'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import ClearIcon from '@mui/icons-material/Clear'

import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import FeedbacksTable from '@/views/feedbacks/components/FeedbacksTable'
import RangePicker from '@/components/common/RangePicker'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import { toSearchParams } from '@/utils/miscUtils'
import RoomsDropdown from '@/views/shared/RoomsDropdown'
import { useGetHotelFeedbacksQuery } from '@/redux/api/roomApi'
import type { IFeedbackSubmission, IRoom } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface QuestionFilter {
  questionId: string | null
  questionType: string
  selectedValues: string[]
  textValue: string
}

// ─── KPI card ───────────────────────────────────────────────────────────────
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

const starLabel = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

// Whether a submission has any form of email (top-level or contact survey answer)
const hasAnyEmail = (f: IFeedbackSubmission) => {
  if (f.email) return true
  return f.surveyAnswers?.some(
    a =>
      a.questionType === 'contact' &&
      typeof a.answer === 'object' &&
      a.answer !== null &&
      !Array.isArray(a.answer) &&
      (a.answer.email || a.answer.phone)
  ) ?? false
}

// ─── Main page ───────────────────────────────────────────────────────────────
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

  // ─── KPI stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const results: IFeedbackSubmission[] = (allData?.results as IFeedbackSubmission[]) ?? []
    const total = results.length
    const withRating = results.filter(f => f.rating && f.rating > 0)
    const avgRating =
      withRating.length > 0
        ? (withRating.reduce((acc, f) => acc + (f.rating ?? 0), 0) / withRating.length).toFixed(1)
        : '—'
    const withSurvey = results.filter(f => f.surveyAnswers && f.surveyAnswers.length > 0).length
    const withEmail = results.filter(hasAnyEmail).length
    return { total, avgRating, withSurvey, withEmail }
  }, [allData])

  // ─── Extract unique questions + observed answer options ────────────────────
  const allQuestions = useMemo(() => {
    const results: IFeedbackSubmission[] = (allData?.results as IFeedbackSubmission[]) ?? []
    const seen = new Map<
      string,
      { id: string; text: string; type: string; options: Set<string> }
    >()

    results.forEach(f => {
      f.surveyAnswers?.forEach(a => {
        if (!a.questionId) return
        if (!seen.has(a.questionId)) {
          seen.set(a.questionId, {
            id: a.questionId,
            text: a.questionText,
            type: a.questionType ?? '',
            options: new Set()
          })
        }
        const entry = seen.get(a.questionId)!
        const ans = a.answer
        if (ans !== null && ans !== undefined && ans !== '') {
          if (Array.isArray(ans)) {
            ans.forEach(v => entry.options.add(String(v)))
          } else if (typeof ans !== 'object') {
            entry.options.add(String(ans))
          }
        }
      })
    })

    return Array.from(seen.values()).map(q => ({ ...q, options: Array.from(q.options).sort() }))
  }, [allData])

  // ─── Room performance ──────────────────────────────────────────────────────
  const roomPerformance = useMemo(() => {
    const results: IFeedbackSubmission[] = (allData?.results as IFeedbackSubmission[]) ?? []
    const map: Record<
      string,
      { number: string; count: number; ratingTotal: number; ratingCount: number; withSurvey: number }
    > = {}

    results.forEach(f => {
      const roomId = typeof f.room === 'object' ? f.room.id : String(f.room)
      const roomNum = typeof f.room === 'object' ? f.room.number : String(f.room)
      if (!map[roomId]) map[roomId] = { number: roomNum, count: 0, ratingTotal: 0, ratingCount: 0, withSurvey: 0 }
      map[roomId].count++
      if (f.rating && f.rating > 0) {
        map[roomId].ratingTotal += f.rating
        map[roomId].ratingCount++
      }
      if (f.surveyAnswers && f.surveyAnswers.length > 0) map[roomId].withSurvey++
    })

    return Object.entries(map)
      .map(([id, d]) => ({
        id,
        number: d.number,
        count: d.count,
        avgRating: d.ratingCount > 0 ? d.ratingTotal / d.ratingCount : null,
        withSurvey: d.withSurvey
      }))
      .sort((a, b) => {
        if (a.avgRating === null && b.avgRating === null) return 0
        if (a.avgRating === null) return 1
        if (b.avgRating === null) return -1
        return a.avgRating - b.avgRating
      })
  }, [allData])

  if (!authUser || !authUser.hotel) return <Loader center />

  const selectedQ = allQuestions.find(q => q.id === questionFilter.questionId)
  const hasActiveQuestionFilter =
    questionFilter.questionId !== null &&
    (questionFilter.selectedValues.length > 0 || questionFilter.textValue.trim() !== '')

  const clearQuestionFilter = () =>
    setQuestionFilter({ questionId: null, questionType: '', selectedValues: [], textValue: '' })

  const toggleAnswerValue = (val: string) =>
    setQuestionFilter(prev => ({
      ...prev,
      selectedValues: prev.selectedValues.includes(val)
        ? prev.selectedValues.filter(v => v !== val)
        : [...prev.selectedValues, val]
    }))

  // For rating: show star chips 1-5 using observed options, sorted numerically
  // For nps: options collected from data (0-10)
  // For yes_no: always show yes/no regardless of data
  const answerOptions =
    questionFilter.questionType === 'yes_no'
      ? ['yes', 'no']
      : questionFilter.questionType === 'rating'
      ? ['1', '2', '3', '4', '5']
      : selectedQ?.options ?? []

  return (
    <Stack gap={4}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        gap={2}
      >
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

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      {allLoading ? (
        <Loader center />
      ) : (
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} flexWrap='wrap'>
          <KpiCard icon={<FeedbackIcon fontSize='small' />} label={dictionary.totalFeedbacks} value={stats.total} color='primary.main' />
          <KpiCard icon={<StarIcon fontSize='small' />} label={dictionary.averageRating} value={stats.avgRating} color='warning.main' />
          <KpiCard icon={<PollIcon fontSize='small' />} label={dictionary.withSurvey} value={stats.withSurvey} color='secondary.main' />
          <KpiCard icon={<EmailIcon fontSize='small' />} label={dictionary.withEmail} value={stats.withEmail} color='success.main' />
        </Stack>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <Stack gap={2}>
        {/* Rating filter */}
        <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
          <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 70 }}>
            {dictionary.rating}:
          </Typography>
          {[0, 1, 2, 3, 4, 5].map(r => (
            <Chip
              key={r}
              label={r === 0 ? dictionary.allRatings : starLabel(r)}
              size='small'
              variant={minRating === r ? 'filled' : 'outlined'}
              color={minRating === r ? 'primary' : 'default'}
              onClick={() => setMinRating(r)}
              sx={{ fontFamily: 'monospace', cursor: 'pointer' }}
            />
          ))}
        </Stack>

        {/* Type filter */}
        <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
          <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 70 }}>
            {dictionary.feedbackType}:
          </Typography>
          {(['all', 'review', 'survey'] as const).map(t => (
            <Chip
              key={t}
              label={t === 'all' ? dictionary.allTypes : t === 'review' ? dictionary.reviewOnly : dictionary.surveyOnly}
              size='small'
              variant={typeFilter === t ? 'filled' : 'outlined'}
              color={typeFilter === t ? 'primary' : 'default'}
              onClick={() => setTypeFilter(t)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Stack>

        {/* Question/Answer filter */}
        {allQuestions.length > 0 && (
          <Stack gap={1.5}>
            <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 70 }}>
                {dictionary.question}:
              </Typography>
              <Select
                size='small'
                value={questionFilter.questionId ?? ''}
                onChange={e => {
                  const q = allQuestions.find(q => q.id === e.target.value)
                  setQuestionFilter({
                    questionId: q?.id ?? null,
                    questionType: q?.type ?? '',
                    selectedValues: [],
                    textValue: ''
                  })
                }}
                displayEmpty
                sx={{ minWidth: 220, fontSize: 13 }}
              >
                <MenuItem value=''>{dictionary.allTypes}</MenuItem>
                {allQuestions.map(q => (
                  <MenuItem key={q.id} value={q.id} sx={{ fontSize: 13 }}>
                    {q.text}
                  </MenuItem>
                ))}
              </Select>
              {questionFilter.questionId && (
                <IconButton size='small' onClick={clearQuestionFilter} title='Clear question filter'>
                  <ClearIcon fontSize='small' />
                </IconButton>
              )}
            </Stack>

            {/* Answer filter — only shown when a question is selected */}
            {questionFilter.questionId && (
              <Stack direction='row' alignItems='center' gap={1} flexWrap='wrap'>
                <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 70 }}>
                  {dictionary.answer}:
                </Typography>

                {questionFilter.questionType === 'open_text' ? (
                  <TextField
                    size='small'
                    placeholder='Contains...'
                    value={questionFilter.textValue}
                    onChange={e => setQuestionFilter(prev => ({ ...prev, textValue: e.target.value }))}
                    sx={{ minWidth: 200, fontSize: 13 }}
                    InputProps={{ sx: { fontSize: 13 } }}
                  />
                ) : (
                  answerOptions.map(opt => {
                    const isActive = questionFilter.selectedValues.includes(opt)
                    let label: string = opt

                    if (questionFilter.questionType === 'rating') {
                      label = starLabel(Number(opt))
                    } else if (questionFilter.questionType === 'yes_no') {
                      label = opt === 'yes' ? 'Yes' : 'No'
                    } else if (questionFilter.questionType === 'nps') {
                      label = `NPS ${opt}`
                    }

                    return (
                      <Chip
                        key={opt}
                        label={label}
                        size='small'
                        variant={isActive ? 'filled' : 'outlined'}
                        color={isActive ? 'secondary' : 'default'}
                        onClick={() => toggleAnswerValue(opt)}
                        sx={{ cursor: 'pointer', fontFamily: questionFilter.questionType === 'rating' ? 'monospace' : 'inherit' }}
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
                    onClick={() =>
                      setQuestionFilter(prev => ({ ...prev, selectedValues: [], textValue: '' }))
                    }
                    sx={{ cursor: 'pointer' }}
                  />
                )}
              </Stack>
            )}
          </Stack>
        )}
      </Stack>

      {/* ── Submissions table ──────────────────────────────────────────────── */}
      <FeedbacksTable
        hotel={authUser.hotel.id}
        room={selectedRoom?.id}
        minRating={minRating}
        typeFilter={typeFilter}
        questionFilter={questionFilter}
      />

      {/* ── Room Performance ───────────────────────────────────────────────── */}
      {roomPerformance.length > 0 && (
        <Stack gap={2}>
          <Stack direction='row' alignItems='center' gap={1}>
            <TrendingDownIcon color='error' />
            <Typography variant='h6'>{dictionary.roomPerformance}</Typography>
            <Typography variant='caption' color='text.secondary'>(sorted by lowest rating first)</Typography>
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
                {roomPerformance.map(r => {
                  const ratingColor =
                    r.avgRating === null
                      ? 'text.secondary'
                      : r.avgRating < 3
                      ? 'error.main'
                      : r.avgRating < 4
                      ? 'warning.main'
                      : 'success.main'

                  return (
                    <TableRow key={r.id} hover sx={r.avgRating !== null && r.avgRating < 3 ? { bgcolor: 'error.50' } : {}}>
                      <TableCell>
                        <Stack direction='row' alignItems='center' gap={1}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: 12, fontWeight: 700 }}>
                            {String(r.number).slice(0, 2)}
                          </Avatar>
                          <Typography variant='body2' fontWeight={500}>{r.number}</Typography>
                          {r.avgRating !== null && r.avgRating < 3 && (
                            <Chip label='Low' size='small' color='error' variant='filled' sx={{ height: 18, fontSize: 10 }} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell><Typography variant='body2'>{r.count}</Typography></TableCell>
                      <TableCell>
                        {r.avgRating !== null ? (
                          <Stack direction='row' alignItems='center' gap={0.5}>
                            <StarIcon sx={{ fontSize: 16, color: '#FFD54F' }} />
                            <Typography variant='body2' fontWeight={600} color={ratingColor}>
                              {r.avgRating.toFixed(1)}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                      <TableCell><Typography variant='body2'>{r.withSurvey}</Typography></TableCell>
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
