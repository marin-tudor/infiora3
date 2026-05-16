import React from 'react'

import {
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import EmailIcon from '@mui/icons-material/Email'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import PollIcon from '@mui/icons-material/Poll'
import HotelIcon from '@mui/icons-material/Hotel'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

import { useDictionary } from '@/contexts/DictionaryContext'
import type { IFeedbackSubmission } from '@/types'

interface FeedbackDetailDrawerProps {
  feedback: IFeedbackSubmission | null
  onClose: () => void
}

const StarRating = ({ value, max = 5 }: { value: number; max?: number }) => (
  <Stack direction='row' gap={0.3}>
    {Array.from({ length: max }).map((_, i) =>
      i < value ? (
        <StarIcon key={i} sx={{ color: '#FFD54F', fontSize: 20 }} />
      ) : (
        <StarBorderIcon key={i} sx={{ color: '#E0E0E0', fontSize: 20 }} />
      )
    )}
    <Typography variant='body2' sx={{ ml: 0.5, fontWeight: 600 }}>
      {value}/{max}
    </Typography>
  </Stack>
)

const AnswerRenderer = ({ type, answer }: { type?: string; answer: any }) => {
  if (answer === null || answer === undefined || answer === '')
    return (
      <Typography variant='body2' color='text.secondary' fontStyle='italic'>
        —
      </Typography>
    )

  switch (type) {
    case 'rating': {
      const num = Number(answer)

      
return <StarRating value={num} />
    }

    case 'nps': {
      const score = Number(answer)
      const pct = (score / 10) * 100
      const color = score >= 9 ? 'success' : score >= 7 ? 'warning' : 'error'

      
return (
        <Stack gap={0.5}>
          <Stack direction='row' alignItems='center' gap={1}>
            <Typography variant='body1' fontWeight={700} sx={{ minWidth: 28 }}>
              {score}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              / 10
            </Typography>
          </Stack>
          <LinearProgress
            variant='determinate'
            value={pct}
            color={color}
            sx={{ height: 6, borderRadius: 3, width: 160 }}
          />
        </Stack>
      )
    }

    case 'yes_no': {
      const isYes = String(answer).toLowerCase() === 'yes' || String(answer).toLowerCase() === 'da'

      
return (
        <Chip
          label={isYes ? 'Yes' : 'No'}
          size='small'
          color={isYes ? 'success' : 'error'}
          variant='filled'
          sx={{ fontWeight: 600 }}
        />
      )
    }

    case 'single_choice':
      return <Chip label={String(answer)} size='small' variant='outlined' color='primary' />

    case 'multi_choice': {
      const arr = Array.isArray(answer) ? answer : [answer]

      
return (
        <Stack direction='row' flexWrap='wrap' gap={0.5}>
          {arr.map((a: string, i: number) => (
            <Chip key={i} label={String(a)} size='small' variant='outlined' color='primary' />
          ))}
        </Stack>
      )
    }

    case 'open_text':
      return (
        <Typography
          variant='body2'
          sx={{
            background: theme => theme.palette.action.hover,
            borderRadius: 1,
            p: 1.5,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6
          }}
        >
          {String(answer)}
        </Typography>
      )

    case 'matrix': {
      if (typeof answer !== 'object' || Array.isArray(answer)) break
      const entries = Object.entries(answer as Record<string, string>)

      if (entries.length === 0)
        return (
          <Typography variant='body2' color='text.secondary'>
            —
          </Typography>
        )
      
return (
        <Table size='small' sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
          <TableHead>
            <TableRow sx={{ background: theme => theme.palette.action.hover }}>
              <TableCell sx={{ fontWeight: 600, py: 0.5 }}>Row</TableCell>
              <TableCell sx={{ fontWeight: 600, py: 0.5 }}>Answer</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(([row, val]) => (
              <TableRow key={row}>
                <TableCell sx={{ py: 0.5 }}>{row}</TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <Chip label={val} size='small' variant='outlined' />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    case 'contact': {
      if (typeof answer !== 'object' || Array.isArray(answer)) break
      const entries = Object.entries(answer as Record<string, string>).filter(([, v]) => v)

      
return (
        <Stack gap={0.5}>
          {entries.map(([k, v]) => (
            <Stack key={k} direction='row' gap={1} alignItems='center'>
              <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'capitalize', minWidth: 60 }}>
                {k}:
              </Typography>
              <Typography variant='body2'>{v}</Typography>
            </Stack>
          ))}
        </Stack>
      )
    }

    default:
      break
  }

  // Fallback
  if (Array.isArray(answer)) {
    return (
      <Stack direction='row' flexWrap='wrap' gap={0.5}>
        {answer.map((a: any, i: number) => (
          <Chip key={i} label={String(a)} size='small' variant='outlined' />
        ))}
      </Stack>
    )
  }

  if (typeof answer === 'object') {
    const entries = Object.entries(answer as Record<string, any>).filter(([, v]) => v)

    
return (
      <Stack gap={0.3}>
        {entries.map(([k, v]) => (
          <Typography key={k} variant='body2'>
            <strong>{k}:</strong> {String(v)}
          </Typography>
        ))}
      </Stack>
    )
  }

  
return <Typography variant='body2'>{String(answer)}</Typography>
}

const Section = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <Stack gap={1}>
    <Stack direction='row' alignItems='center' gap={0.8}>
      <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography
        variant='caption'
        color='text.secondary'
        fontWeight={600}
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
    </Stack>
    <Box sx={{ pl: 3 }}>{children}</Box>
  </Stack>
)

const FeedbackDetailDrawer: React.FC<FeedbackDetailDrawerProps> = ({ feedback, onClose }) => {
  const dictionary = useDictionary()

  const roomNumber =
    feedback?.room && typeof feedback.room === 'object' ? feedback.room.number : String(feedback?.room ?? '')

  const date = feedback
    ? new Date(feedback.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : ''

  const hasReview = !!(feedback?.rating || feedback?.message || feedback?.email)
  const hasSurvey = !!(feedback?.surveyAnswers && feedback.surveyAnswers.length > 0)

  return (
    <Drawer
      anchor='right'
      open={!!feedback}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 440 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{ px: 3, py: 2, borderBottom: theme => `1px solid ${theme.palette.divider}` }}
      >
        <Stack direction='row' alignItems='center' gap={1.5}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            <HotelIcon fontSize='small' />
          </Avatar>
          <Stack>
            <Typography variant='subtitle1' fontWeight={700}>
              {dictionary.room} {roomNumber}
            </Typography>
            <Stack direction='row' alignItems='center' gap={0.4}>
              <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
              <Typography variant='caption' color='text.secondary'>
                {date}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
        <IconButton onClick={onClose} size='small'>
          <CloseIcon fontSize='small' />
        </IconButton>
      </Stack>

      {/* Type badges */}
      <Stack direction='row' gap={1} sx={{ px: 3, pt: 2 }}>
        {hasReview && <Chip label={dictionary.reviewOnly} size='small' color='primary' variant='outlined' />}
        {hasSurvey && <Chip label={dictionary.surveyOnly} size='small' color='secondary' variant='outlined' />}
      </Stack>

      {/* Body */}
      <Stack gap={3} sx={{ px: 3, py: 2, overflowY: 'auto', flex: 1 }}>
        {/* Review section */}
        {hasReview && (
          <>
            {feedback?.rating !== undefined && feedback.rating > 0 && (
              <Section icon={<StarIcon fontSize='small' />} label={dictionary.rating}>
                <StarRating value={feedback.rating} />
              </Section>
            )}

            {feedback?.email && (
              <Section icon={<EmailIcon fontSize='small' />} label={dictionary.email}>
                <Typography variant='body2'>{feedback.email}</Typography>
              </Section>
            )}

            {feedback?.message && (
              <Section icon={<ChatBubbleOutlineIcon fontSize='small' />} label={dictionary.message}>
                <Typography
                  variant='body2'
                  sx={{
                    background: theme => theme.palette.action.hover,
                    borderRadius: 1,
                    p: 1.5,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6
                  }}
                >
                  {feedback.message}
                </Typography>
              </Section>
            )}
          </>
        )}

        {/* Survey answers */}
        {hasSurvey && (
          <>
            {hasReview && <Divider />}
            <Section icon={<PollIcon fontSize='small' />} label={dictionary.surveyAnswers}>
              <Stack gap={3}>
                {feedback!.surveyAnswers!.map((item, idx) => (
                  <Stack key={idx} gap={1}>
                    <Stack direction='row' gap={0.5} alignItems='flex-start'>
                      <Typography
                        variant='caption'
                        sx={{
                          minWidth: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          flexShrink: 0,
                          mt: 0.1
                        }}
                      >
                        {idx + 1}
                      </Typography>
                      <Typography variant='body2' fontWeight={600} sx={{ lineHeight: 1.4 }}>
                        {item.questionText}
                      </Typography>
                    </Stack>
                    <Box sx={{ pl: 3.5 }}>
                      <AnswerRenderer type={item.questionType} answer={item.answer} />
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Section>
          </>
        )}

        {!hasReview && !hasSurvey && (
          <Typography variant='body2' color='text.secondary' textAlign='center' sx={{ mt: 4 }}>
            {dictionary.noFeedbacks}
          </Typography>
        )}
      </Stack>
    </Drawer>
  )
}

export default FeedbackDetailDrawer
