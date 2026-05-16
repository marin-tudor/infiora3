import { useRoom } from "@/contexts/RoomContext";
import { ILanguage, IFeedback } from "@/types";
import { useEffect, useRef } from "react";

export default function PageTracker({
  roomId,
  activityId,
  language,
  feedback,
}: {
  roomId: string;
  activityId?: string;
  language: ILanguage;
  feedback?: IFeedback;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  const { feedbackDialog, isDialogOpen } = useRoom();
  const openFeedbackDialog = feedbackDialog.open;

  const totalTimeSpent = useRef(0);
  const lastEngaged = useRef(Date.now());
  const hasEngaged = useRef(false);
  const feedbackShown = useRef(false);
  const isDialogOpenRef = useRef(isDialogOpen);

  // Keep ref in sync with current value — read inside setTimeout to avoid stale closure
  isDialogOpenRef.current = isDialogOpen;

  useEffect(() => {
    const handleEngagement = () => {
      lastEngaged.current = Date.now();

      // Mark as engaged and show feedback if applicable
      if (!hasEngaged.current) {
        hasEngaged.current = true;

        // Show feedback after 3 seconds if user engaged and feedback is active
        if (feedback?.isActive && !feedbackShown.current) {
          const feedbackKey = `feedback-completed-${roomId}`;
          const hasCompletedFeedback = localStorage.getItem(feedbackKey);
          if (!hasCompletedFeedback) {
            feedbackShown.current = true;
            // Try to show feedback, retry up to 30 times (30s) if another dialog is open
            const tryShowFeedback = (attemptsLeft = 30) => {
              if (!isDialogOpenRef.current) {
                openFeedbackDialog();
              } else if (attemptsLeft > 0) {
                setTimeout(() => tryShowFeedback(attemptsLeft - 1), 1000);
              }
            };
            setTimeout(() => tryShowFeedback(), 3000);
          }
        }
      }
    };

    const updateRoom = async (time: number) => {
      try {
        if (activityId) {
          await fetch(`${baseUrl}/v1/rooms/${roomId}/activity/${activityId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              time,
              engaged: true,
              language: language.name,
            }),
          });
        }
      } catch (error) {
        console.error("Error updating room:", error);
      }
    };

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastEngagement = (now - lastEngaged.current) / 1000;
      if (timeSinceLastEngagement < 60) {
        totalTimeSpent.current += 60 - timeSinceLastEngagement;
        const time = parseInt(totalTimeSpent.current.toFixed(0));
        updateRoom(time);
      }
    }, 60000);

    document.addEventListener("click", handleEngagement);
    document.addEventListener("scroll", handleEngagement);
    document.addEventListener("keypress", handleEngagement);

    return () => {
      clearInterval(interval);
      document.removeEventListener("click", handleEngagement);
      document.removeEventListener("scroll", handleEngagement);
      document.removeEventListener("keypress", handleEngagement);
    };
  }, [baseUrl, roomId, activityId, language, feedback?.isActive, openFeedbackDialog]);

  return null;
}
