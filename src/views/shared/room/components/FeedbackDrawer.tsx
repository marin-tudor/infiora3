import React, { useState } from 'react'

import { Drawer, Typography, Stack, Button, Box, TextField } from '@mui/material'
import { Rating } from 'react-simple-star-rating'
import { toast } from 'react-toastify'

import type { IRoom } from '@/types'

interface FeedbackDrawerProps {
  room: IRoom
  show: boolean
  setShow: React.Dispatch<React.SetStateAction<boolean>>
}

const FeedbackDrawer: React.FC<FeedbackDrawerProps> = ({ room, show, setShow }) => {
  const [rating, setRating] = useState(0)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedbackSaved, setFeedbackSaved] = useState(false)

  const handleRatingChange = async (rate: number) => {
    // Prevent duplicate submissions
    if (loading || feedbackSaved) return

    setRating(rate)

    if (rate > 3) {
      try {
        await handleSaveFeedback(rate)
      } catch (error) {
        // Error already handled in handleSaveFeedback
        console.error('Failed to save positive rating:', error)
      }
    }
  }

  const handleMaybeLater = () => {
    setRating(0)
    setEmail('')
    setMessage('')
    setFeedbackSaved(false)
    setShow(false)
  }

  const handleClose = () => {
    setShow(false)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    return emailRegex.test(email)
  }

  const validateFields = () => {
    const errors: string[] = []

    // Email validation
    if (room.feedback?.emailRequirement === 'mandatory' && !email.trim()) {
      errors.push('Email is required')
    } else if (email.trim() && !validateEmail(email.trim())) {
      errors.push('Please enter a valid email address')
    }

    // Message validation
    if (room.feedback?.textRequirement === 'mandatory' && !message.trim()) {
      errors.push('Feedback message is required')
    } else if (message.trim() && message.trim().length < 10) {
      errors.push('Feedback message must be at least 10 characters long')
    }

    if (errors.length > 0) {
      throw new Error(errors.join('. '))
    }
  }

  const handleSubmitFeedback = async () => {
    // Prevent duplicate submissions
    if (loading || feedbackSaved) return

    try {
      validateFields()
      await handleSaveFeedback(rating)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Validation failed')
    }
  }

  const handleGoogleReview = () => {
    // Open Google review link (feedback already saved when rating was selected)
    if (room.feedback?.googleMapsLink) {
      window.open(room.feedback.googleMapsLink, '_blank')
    }

    // Close the drawer after opening Google review
    handleMaybeLater()
  }

  const handleSaveFeedback = async (rating: number) => {
    // Prevent duplicate submissions
    if (feedbackSaved) return

    try {
      setLoading(true)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL

      if (!baseUrl) {
        throw new Error('API URL not configured')
      }

      const url = `${baseUrl}/v1/rooms/feedback`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: room.id,
          hotel: room.hotel.id,
          rating,
          email: email.trim(),
          message: message.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.text()

        throw new Error(`Failed to submit feedback: ${errorData || response.statusText}`)
      }

      setFeedbackSaved(true)
      const feedbackKey = `feedback-completed-${room.id}`

      localStorage.setItem(feedbackKey, 'true')

      if (rating <= 3) {
        handleMaybeLater()
      }

      toast.success('Thank you for your feedback!')
    } catch (error) {
      console.error('Error sending feedback:', error)

      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.'

      toast.error(errorMessage)
      throw error // Re-throw to prevent marking as completed
    } finally {
      setLoading(false)
    }
  }

  const showFeedbackForm = rating > 0 && rating <= 3
  const showGoogleReview = rating > 3 && feedbackSaved

  return (
    <Drawer
      anchor='bottom'
      open={show}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          p: 3
        }
      }}
    >
      <Stack spacing={3} alignItems='center'>
        <Typography variant='h6' fontWeight='bold' textAlign='center'>
          Enjoy your stay?
        </Typography>

        {!showFeedbackForm && !showGoogleReview && (
          <Typography variant='body1' color='text.secondary' textAlign='center'>
            Thank you for the feedback. Would you mind to leave us a review?
          </Typography>
        )}

        <Box>
          <Rating
            initialValue={rating}
            onClick={handleRatingChange}
            size={32}
            allowFraction={false}
            fillColor='#FFD54F'
            emptyColor='#E0E0E0'
            SVGstyle={{ display: 'inline-block' }}
            readonly={loading || rating > 0}
          />
        </Box>

        {showFeedbackForm && (
          <Stack spacing={2} sx={{ width: '100%' }}>
            <Typography variant='body2' color='text.secondary' textAlign='center'>
              We&apos;re sorry to hear that. Please let us know how we can improve.
            </Typography>

            {room.feedback?.emailRequirement !== 'none' && (
              <TextField
                label='Email'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                required={room.feedback?.emailRequirement === 'mandatory'}
                fullWidth
                size='small'
                placeholder='your.email@example.com'
              />
            )}

            {room.feedback?.textRequirement !== 'none' && (
              <TextField
                label='Your feedback'
                multiline
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                required={room.feedback?.textRequirement === 'mandatory'}
                fullWidth
                size='small'
                placeholder='Tell us how we can improve...'
              />
            )}

            <Button
              variant='contained'
              onClick={handleSubmitFeedback}
              disabled={loading}
              sx={{
                borderRadius: 2
              }}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </Stack>
        )}

        {showGoogleReview && room.feedback?.googleMapsLink && (
          <Stack spacing={2} sx={{ width: '100%' }}>
            <Typography variant='body1' color='text.secondary' textAlign='center'>
              Thank you for the great rating! Would you mind sharing your experience on Google?
            </Typography>

            <Button
              variant='contained'
              onClick={handleGoogleReview}
              sx={{
                borderRadius: 2
              }}
            >
              Leave Google Review
            </Button>
          </Stack>
        )}

        {!showFeedbackForm && !showGoogleReview && (
          <Button
            variant='outlined'
            onClick={handleMaybeLater}
            sx={{
              minWidth: 120,
              borderRadius: 2
            }}
          >
            Maybe later
          </Button>
        )}

        {(showFeedbackForm || showGoogleReview) && (
          <Button
            variant='text'
            onClick={handleMaybeLater}
            sx={{
              borderRadius: 2
            }}
          >
            Maybe later
          </Button>
        )}
      </Stack>
    </Drawer>
  )
}

export default FeedbackDrawer
