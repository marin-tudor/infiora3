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

  const totalTimeSpent = useRef(0);
  const lastEngaged = useRef(Date.now());
  const hasEngaged = useRef(false);
  const feedbackShown = useRef(false);
  const isDialogOpenRef = useRef(isDialogOpen);

  // Keep ref in sync with current value
  useEffect(() => {
    isDialogOpenRef.current = isDialogOpen;
  }, [isDialogOpen]);

  useEffect(() => {
    const handleEngagement = () => {
      console.log("engaged");
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
            // Try to show feedback, retry if dialog is open
            const tryShowFeedback = () => {
              if (!isDialogOpenRef.current) {
                feedbackDialog.open();
              } else {
                // Retry after 1 second if a dialog is open
                setTimeout(tryShowFeedback, 1000);
              }
            };
            setTimeout(tryShowFeedback, 3000);
          }
        }
      }
    };

    const updateRoom = async (time: number) => {
      try {
        if (activityId) {
          const url = new URL(`${baseUrl}/v1/rooms/${roomId}`);
          const params = new URLSearchParams({
            activityId,
            time: time.toString(),
            engaged: "true",
            language: language.name,
          });

          url.search = params.toString();

          await fetch(url.toString(), {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
      } catch (error) {
        console.error("Error updating room:", error);
      }
    };

    const interval = setInterval(() => {
      console.log("interval");
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
  }, [baseUrl, roomId, activityId, language, feedback?.isActive, feedbackDialog]);

  return null;
}
