import { useMemo, useState } from 'react'

import { endOfToday, startOfToday } from 'date-fns'

import { Avatar, Box, Chip, Stack, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import PollIcon from '@mui/icons-material/Poll'
import RateReviewIcon from '@mui/icons-material/RateReview'

import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import Loader from '@/components/common/Loader'
import DataTable from '@/components/common/DataTable'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useGetFeedbacksQuery } from '@/redux/api/roomApi'
import type { IFeedbackSubmission } from '@/types'
import type { QuestionFilter } from '../pages/FeedbacksPage'
import FeedbackDetailDrawer from './FeedbackDetailDrawer'

interface FeedbacksTableProps {
  room?: string
  hotel: string
  minRating?: number
  typeFilter?: 'all' | 'review' | 'survey'
  questionFilter?: QuestionFilter
}

const StarRow = ({ value }: { value?: number }) => {
  if (!value) return <Typography variant='body2' color='text.secondary'>—</Typography>
  return (
    <Stack direction='row' alignItems='center' gap={0.4}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} sx={{ fontSize: 14, color: i < value ? '#FFD54F' : '#E0E0E0' }} />
      ))}
      <Typography variant='caption' color='text.secondary' sx={{ ml: 0.3 }}>
        {value}
      </Typography>
    </Stack>
  )
}

const TypeBadge = ({ feedback }: { feedback: IFeedbackSubmission }) => {
  const hasSurvey = !!(feedback.surveyAnswers && feedback.surveyAnswers.length > 0)
  const hasReview = !!(feedback.rating || feedback.message || feedback.email)

  if (hasSurvey && hasReview) {
    return (
      <Stack direction='row' gap={0.5}>
        <Chip icon={<RateReviewIcon />} label='Review' size='small' color='primary' variant='outlined' sx={{ '& .MuiChip-icon': { fontSize: 13 } }} />
        <Chip icon={<PollIcon />} label='Survey' size='small' color='secondary' variant='outlined' sx={{ '& .MuiChip-icon': { fontSize: 13 } }} />
      </Stack>
    )
  }
  if (hasSurvey)
    return <Chip icon={<PollIcon />} label='Survey' size='small' color='secondary' variant='outlined' sx={{ '& .MuiChip-icon': { fontSize: 13 } }} />
  return <Chip icon={<RateReviewIcon />} label='Review' size='small' color='primary' variant='outlined' sx={{ '& .MuiChip-icon': { fontSize: 13 } }} />
}

const FeedbacksTable = ({ room, hotel, minRating = 0, typeFilter = 'all', questionFilter }: FeedbacksTableProps) => {
  const dictionary = useDictionary()
  const [selectedFeedback, setSelectedFeedback] = useState<IFeedbackSubmission | null>(null)

  const searchParams: any = useSearchQuery(['startDate', 'endDate', 'page', 'limit', 'search'])

  const start = useMemo(() => startOfToday(), [])
  const end = useMemo(() => endOfToday(), [])

  const { data, isLoading } = useGetFeedbacksQuery({
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    ...searchParams,
    hotel,
    room
  } as any)

  const filtered = useMemo(() => {
    if (!data?.results) return []
    let items: IFeedbackSubmission[] = data.results as IFeedbackSubmission[]

    if (minRating > 0) {
      items = items.filter(f => (f.rating ?? 0) >= minRating)
    }

    if (typeFilter === 'review') {
      items = items.filter(f => !(f.surveyAnswers && f.surveyAnswers.length > 0))
    } else if (typeFilter === 'survey') {
      items = items.filter(f => !!(f.surveyAnswers && f.surveyAnswers.length > 0))
    }

    // Question/answer filter
    if (questionFilter?.questionId) {
      const { questionId, questionType, selectedValues, textValue } = questionFilter
      const hasValues = selectedValues.length > 0
      const hasText = textValue.trim() !== ''

      if (hasValues || hasText) {
        items = items.filter(f => {
          const qa = f.surveyAnswers?.find(a => a.questionId === questionId)
          if (!qa) return false
          const ans = qa.answer

          if (questionType === 'open_text') {
            return String(ans ?? '').toLowerCase().includes(textValue.toLowerCase())
          }

          if (questionType === 'multi_choice') {
            const arr: string[] = Array.isArray(ans) ? ans.map(String) : [String(ans ?? '')]
            return selectedValues.some(v => arr.includes(v))
          }

          // yes_no, single_choice, rating, nps → exact match against selectedValues
          return selectedValues.includes(String(ans ?? ''))
        })
      }
    }

    return items
  }, [data?.results, minRating, typeFilter, questionFilter])

  const columns = [
    {
      field: 'room',
      headerName: dictionary.room,
      flex: 0.7,
      renderCell: ({ row }: any) => {
        const num = typeof row.room === 'object' ? row.room?.number : row.room
        return (
          <Stack direction='row' alignItems='center' gap={1}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: 12, fontWeight: 700 }}>
              {String(num ?? '?').slice(0, 2)}
            </Avatar>
            <Typography variant='body2' fontWeight={500}>
              {num ?? '—'}
            </Typography>
          </Stack>
        )
      }
    },
    {
      field: 'type',
      headerName: dictionary.feedbackType,
      flex: 1,
      sortable: false,
      renderCell: ({ row }: any) => <TypeBadge feedback={row} />
    },
    {
      field: 'rating',
      headerName: dictionary.rating,
      flex: 0.8,
      renderCell: ({ row }: any) => <StarRow value={row.rating} />
    },
    {
      field: 'email',
      headerName: dictionary.email,
      flex: 1,
      renderCell: ({ row }: any) => {
        // top-level email or email inside a contact-type survey answer
        const email =
          row.email ||
          row.surveyAnswers?.find(
            (a: any) =>
              a.questionType === 'contact' &&
              typeof a.answer === 'object' &&
              a.answer !== null &&
              a.answer.email
          )?.answer?.email
        return email ? (
          <Typography variant='body2' noWrap sx={{ maxWidth: 160 }}>
            {email}
          </Typography>
        ) : (
          <Typography variant='body2' color='text.secondary'>—</Typography>
        )
      }
    },
    {
      field: 'createdAt',
      headerName: dictionary.submittedAt ?? dictionary.submitedAt,
      flex: 1,
      renderCell: ({ row }: any) => {
        const date = new Date(row.createdAt)
        return (
          <Typography variant='body2' color='text.secondary'>
            {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Typography>
        )
      }
    }
  ]

  return (
    <>
      {isLoading && <Loader center />}
      <DataTable
        data={{ ...data, results: filtered }}
        columns={columns}
        params={searchParams}
        onView={id => {
          const fb = filtered.find((item: IFeedbackSubmission) => item.id === id)
          if (fb) setSelectedFeedback(fb)
        }}
      />
      <FeedbackDetailDrawer
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
      />
    </>
  )
}

export default FeedbacksTable
