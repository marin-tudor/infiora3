import React, { useState, useCallback, useRef } from "react";
import { IRoom } from "@/types";
import {
  Drawer,
  Typography,
  Stack,
  Button,
  Box,
  TextField,
} from "@mui/material";
import { Rating } from "react-simple-star-rating";
import { toast } from "react-toastify";

// Step 1: Collect Rating
const RatingStep = ({
  onRate,
  onSkip,
}: {
  onRate: (rating: number) => void;
  onSkip: () => void;
}) => (
  <Stack spacing={3} alignItems="center">
    <Typography variant="h6" fontWeight="bold" textAlign="center">
      Enjoy your stay?
    </Typography>

    <Typography variant="body1" color="text.secondary" textAlign="center">
      Would you mind to leave us a review?
    </Typography>

    <Box>
      <Rating
        initialValue={0}
        onClick={onRate}
        size={32}
        allowFraction={false}
        fillColor="#FFD54F"
        emptyColor="#E0E0E0"
        SVGstyle={{ display: "inline-block" }}
      />
    </Box>
    <Button variant="text" onClick={onSkip} sx={{ borderRadius: 2 }}>
      Maybe later
    </Button>
  </Stack>
);

// Step 2: Collect Feedback (rating <= 3)
const FeedbackStep = ({
  room,
  loading,
  onSubmit,
  onSkip,
}: {
  room: IRoom;
  loading: boolean;
  onSubmit: (email: string, message: string) => void;
  onSkip: () => void;
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (room.feedback?.emailRequirement === "mandatory" && !email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (room.feedback?.textRequirement === "mandatory" && !message.trim()) {
      toast.error("Feedback message is required");
      return;
    }
    onSubmit(email.trim(), message.trim());
  };

  return (
    <Stack spacing={3} alignItems="center">
      <Typography variant="h6" fontWeight="bold" textAlign="center">
        We&apos;re sorry to hear that
      </Typography>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        Please let us know how we can improve.
      </Typography>

      <Stack spacing={2} sx={{ width: "100%", mt: 2 }}>
        {room.feedback?.emailRequirement !== "none" && (
          <TextField
            label={
              room.feedback?.emailRequirement === "mandatory"
                ? "Email"
                : "Email (optional)"
            }
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
            placeholder="your.email@example.com"
          />
        )}

        {room.feedback?.textRequirement !== "none" && (
          <TextField
            label={
              room.feedback?.textRequirement === "mandatory"
                ? "Your feedback"
                : "Your feedback (optional)"
            }
            multiline
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            size="small"
            placeholder="Tell us how we can improve..."
          />
        )}

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ borderRadius: 2, mt: 1 }}
        >
          {loading ? "Submitting..." : "Submit Feedback"}
        </Button>

        <Button variant="text" onClick={onSkip} sx={{ borderRadius: 2 }}>
          Maybe later
        </Button>
      </Stack>
    </Stack>
  );
};

// Step 3: Google Review (rating > 3)
const GoogleReviewStep = ({
  googleMapsLink,
  onReview,
  onSkip,
}: {
  googleMapsLink?: string;
  onReview: () => void;
  onSkip: () => void;
}) => (
  <Stack spacing={3} alignItems="center">
    <Typography variant="h6" fontWeight="bold" textAlign="center">
      Thank you!
    </Typography>

    <Typography variant="body1" color="text.secondary" textAlign="center">
      Would you mind sharing your experience on Google?
    </Typography>

    <Stack spacing={2} sx={{ width: "100%" }}>
      {googleMapsLink && (
        <Button variant="contained" onClick={onReview} sx={{ borderRadius: 2 }}>
          Leave Google Review
        </Button>
      )}

      <Button variant="text" onClick={onSkip} sx={{ borderRadius: 2 }}>
        Maybe later
      </Button>
    </Stack>
  </Stack>
);

interface FeedbackDrawerProps {
  room: IRoom;
  onClose: () => void;
}

type Step = "rating" | "feedback" | "google";

const FeedbackDrawer: React.FC<FeedbackDrawerProps> = ({ room, onClose }) => {
  const [step, setStep] = useState<Step>("rating");
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const hasRated = useRef(false);

  const saveFeedback = useCallback(
    async (feedbackRating: number, email = "", message = "") => {
      setLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) throw new Error("API URL not configured");

        const response = await fetch(`${baseUrl}/v1/rooms/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: room.id,
            hotel: room.hotel.id,
            rating: feedbackRating,
            email,
            message,
          }),
        });

        if (!response.ok) throw new Error("Failed to submit feedback");

        localStorage.setItem(`feedback-completed-${room.id}`, "true");
        toast.success("Thank you for your feedback!");
        return true;
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [room.id, room.hotel.id]
  );

  const handleRate = useCallback(
    (rate: number) => {
      // Prevent multiple rating submissions
      if (hasRated.current) return;
      hasRated.current = true;

      setRating(rate);

      if (rate > 3) {
        // Good rating - save and show Google review step
        saveFeedback(rate);
        setStep("google");
      } else {
        // Bad rating - delay showing form to prevent accidental button click
        setTimeout(() => setStep("feedback"), 100);
      }
    },
    [saveFeedback]
  );

  const handleFeedbackSubmit = useCallback(
    async (email: string, message: string) => {
      const success = await saveFeedback(rating, email, message);
      if (success) onClose();
    },
    [saveFeedback, rating, onClose]
  );

  const handleGoogleReview = useCallback(() => {
    if (room.feedback?.googleMapsLink) {
      window.open(room.feedback.googleMapsLink, "_blank");
    }
    onClose();
  }, [room.feedback?.googleMapsLink, onClose]);

  return (
    <Drawer
      anchor="bottom"
      open={true}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          p: 3,
        },
      }}
    >
      {step === "rating" && <RatingStep onRate={handleRate} onSkip={onClose} />}

      {step === "feedback" && (
        <FeedbackStep
          room={room}
          loading={loading}
          onSubmit={handleFeedbackSubmit}
          onSkip={onClose}
        />
      )}

      {step === "google" && (
        <GoogleReviewStep
          googleMapsLink={room.feedback?.googleMapsLink}
          onReview={handleGoogleReview}
          onSkip={onClose}
        />
      )}
    </Drawer>
  );
};

export default FeedbackDrawer;
