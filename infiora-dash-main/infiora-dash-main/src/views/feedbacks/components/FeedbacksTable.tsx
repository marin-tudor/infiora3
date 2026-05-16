import { useMemo, useState } from 'react'

import { endOfToday, startOfToday } from 'date-fns'

import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PollIcon from '@mui/icons-material/Poll'
import RateReviewIcon from '@mui/icons-material/RateReview'
import StarIcon from '@mui/icons-material/Star'

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
  if (!value) {
    return (
      <Typography variant='body2' color='text.secondary'>
        -
      </Typography>
    )
  }

  return (
    <Stack direction='row' alignItems='center' gap={0.4}>
      {Array.from({ length: 5 }).map((_, index) => (
        <StarIcon key={index} sx={{ fontSize: 14, color: index < value ? '#FFD54F' : '#E0E0E0' }} />
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
        <Chip
          icon={<RateReviewIcon />}
          label='Review'
          size='small'
          color='primary'
          variant='outlined'
          sx={{ '& .MuiChip-icon': { fontSize: 13 } }}
        />
        <Chip
          icon={<PollIcon />}
          label='Survey'
          size='small'
          color='secondary'
          variant='outlined'
          sx={{ '& .MuiChip-icon': { fontSize: 13 } }}
        />
      </Stack>
    )
  }

  if (hasSurvey) {
    return (
      <Chip
        icon={<PollIcon />}
        label='Survey'
        size='small'
        color='secondary'
        variant='outlined'
        sx={{ '& .MuiChip-icon': { fontSize: 13 } }}
      />
    )
  }

  return (
    <Chip
      icon={<RateReviewIcon />}
      label='Review'
      size='small'
      color='primary'
      variant='outlined'
      sx={{ '& .MuiChip-icon': { fontSize: 13 } }}
    />
  )
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
    if (!data?.results) {
      return []
    }

    let items = data.results as IFeedbackSubmission[]

    if (minRating > 0) {
      items = items.filter(item => (item.rating ?? 0) >= minRating)
    }

    if (typeFilter === 'review') {
      items = items.filter(item => !(item.surveyAnswers && item.surveyAnswers.length > 0))
    } else if (typeFilter === 'survey') {
      items = items.filter(item => !!(item.surveyAnswers && item.surveyAnswers.length > 0))
    }

    if (questionFilter?.questionId) {
      const { questionId, questionType, selectedValues, textValue } = questionFilter
      const hasValues = selectedValues.length > 0
      const hasText = textValue.trim() !== ''

      if (hasValues || hasText) {
        items = items.filter(item => {
          const answer = item.surveyAnswers?.find(entry => entry.questionId === questionId)

          if (!answer) {
            return false
          }

          const value = answer.answer

          if (questionType === 'open_text') {
            return String(value ?? '')
              .toLowerCase()
              .includes(textValue.toLowerCase())
          }

          if (questionType === 'multi_choice') {
            const values = Array.isArray(value) ? value.map(String) : [String(value ?? '')]

            return selectedValues.some(selected => values.includes(selected))
          }

          return selectedValues.includes(String(value ?? ''))
        })
      }
    }

    return items
  }, [data?.results, minRating, questionFilter, typeFilter])

  const columns = [
    {
      field: 'room',
      headerName: dictionary.room,
      flex: 0.7,
      renderCell: ({ row }: any) => {
        const number = typeof row.room === 'object' ? row.room?.number : row.room

        return (
          <Stack direction='row' alignItems='center' gap={1}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: 12, fontWeight: 700 }}>
              {String(number ?? '?').slice(0, 2)}
            </Avatar>
            <Typography variant='body2' fontWeight={500}>
              {number ?? '-'}
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
        const email =
          row.email ||
          row.surveyAnswers?.find(
            (answer: any) =>
              answer.questionType === 'contact' &&
              typeof answer.answer === 'object' &&
              answer.answer !== null &&
              answer.answer.email
          )?.answer?.email

        if (email) {
          return (
            <Typography variant='body2' noWrap sx={{ maxWidth: 160 }}>
              {email}
            </Typography>
          )
        }

        return (
          <Typography variant='body2' color='text.secondary'>
            -
          </Typography>
        )
      }
    },
    {
      field: 'createdAt',
      headerName: dictionary.submittedAt ?? dictionary.submitedAt,
      flex: 1,
      renderCell: ({ row }: any) => (
        <Typography variant='body2' color='text.secondary'>
          {new Date(row.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </Typography>
      )
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
          const feedback = filtered.find(item => item.id === id)

          if (feedback) {
            setSelectedFeedback(feedback)
          }
        }}
      />
      <FeedbackDetailDrawer feedback={selectedFeedback} onClose={() => setSelectedFeedback(null)} />
    </>
  )
}

export default FeedbacksTable
