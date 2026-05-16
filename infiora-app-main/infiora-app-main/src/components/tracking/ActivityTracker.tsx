"use client";

import { useEffect, useRef } from "react";
import { isDesktop, isIOS } from "react-device-detect";
import { getAnonymousVisitorId } from "@/lib/visitorIdentity";

interface ActivityTrackerProps {
  roomId: string;
  activityId?: string;
  languageName?: string;
  onFirstEngagement?: () => void;
  storageKey?: string;
}

export default function ActivityTracker({
  roomId,
  activityId,
  languageName,
  onFirstEngagement,
  storageKey,
}: ActivityTrackerProps) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const resolvedStorageKey = storageKey || `room-${roomId}-${activityId || "live"}`;

  const currentActivityId = useRef<string | undefined>(activityId);
  const visibleStartedAt = useRef<number | null>(
    typeof document !== "undefined" && !document.hidden ? Date.now() : null
  );
  const totalTimeMs = useRef(0);
  const lastSentSeconds = useRef(0);
  const lastSentEngaged = useRef(false);
  const hasEngaged = useRef(false);
  const isCreatingActivity = useRef(false);

  useEffect(() => {
    currentActivityId.current = activityId;
  }, [activityId]);

  useEffect(() => {
    if (!baseUrl) return;

    try {
      const persisted = sessionStorage.getItem(
        `infiora-activity-tracker-${resolvedStorageKey}`
      );
      if (persisted) {
        const parsed = JSON.parse(persisted) as {
          activityId?: string;
          totalTimeMs?: number;
          lastSentSeconds?: number;
          hasEngaged?: boolean;
          lastSentEngaged?: boolean;
        };

        if (!currentActivityId.current && parsed.activityId) {
          currentActivityId.current = parsed.activityId;
        }
        totalTimeMs.current = parsed.totalTimeMs || 0;
        lastSentSeconds.current = parsed.lastSentSeconds || 0;
        hasEngaged.current = !!parsed.hasEngaged;
        lastSentEngaged.current = !!parsed.lastSentEngaged;
      }
    } catch {
      // Ignore persistence errors in private mode or restricted contexts.
    }

    const persistState = () => {
      try {
        sessionStorage.setItem(
          `infiora-activity-tracker-${resolvedStorageKey}`,
          JSON.stringify({
            activityId: currentActivityId.current,
            totalTimeMs: totalTimeMs.current,
            lastSentSeconds: lastSentSeconds.current,
            hasEngaged: hasEngaged.current,
            lastSentEngaged: lastSentEngaged.current,
          })
        );
      } catch {
        // Ignore persistence errors in private mode or restricted contexts.
      }
    };

    const resolvedLanguageName =
      languageName ||
      (typeof navigator !== "undefined"
        ? navigator.languages?.[0] || navigator.language
        : undefined);

    const accumulateVisibleTime = () => {
      if (visibleStartedAt.current === null) return;

      totalTimeMs.current += Date.now() - visibleStartedAt.current;
      visibleStartedAt.current = Date.now();
      persistState();
    };

    const createActivityIfNeeded = async () => {
      if (currentActivityId.current || isCreatingActivity.current) return;

      isCreatingActivity.current = true;

      try {
        const visitorId = getAnonymousVisitorId();
        const device = isDesktop ? "Desktop" : isIOS ? "iOS" : "Android";
        const response = await fetch(`${baseUrl}/v1/rooms/${roomId}/activity`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "view",
            visitorId,
            device,
            ...(resolvedLanguageName ? { language: resolvedLanguageName } : {}),
          }),
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = await response.json();
        if (data.activityId) {
          currentActivityId.current = data.activityId;
          persistState();
        }
      } catch (error) {
        console.error("Error creating activity:", error);
      } finally {
        isCreatingActivity.current = false;
      }
    };

    const sendUpdate = async (keepalive = false) => {
      accumulateVisibleTime();

      if (!currentActivityId.current) {
        await createActivityIfNeeded();
      }

      const resolvedActivityId = currentActivityId.current;
      if (!resolvedActivityId) return;

      const seconds = Math.floor(totalTimeMs.current / 1000);
      if (
        seconds === lastSentSeconds.current &&
        hasEngaged.current === lastSentEngaged.current
      ) {
        return;
      }

      try {
        await fetch(`${baseUrl}/v1/rooms/${roomId}/activity/${resolvedActivityId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            time: seconds,
            engaged: hasEngaged.current,
            ...(resolvedLanguageName ? { language: resolvedLanguageName } : {}),
          }),
          keepalive,
        });
        lastSentSeconds.current = seconds;
        lastSentEngaged.current = hasEngaged.current;
        persistState();
      } catch (error) {
        console.error("Error updating room activity:", error);
      }
    };

    const handleEngagement = () => {
      if (hasEngaged.current) return;

      hasEngaged.current = true;
      persistState();
      onFirstEngagement?.();
      void sendUpdate();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        void sendUpdate(true);
        visibleStartedAt.current = null;
        return;
      }

      visibleStartedAt.current = Date.now();
      void createActivityIfNeeded();
    };

    const handlePageHide = () => {
      void sendUpdate(true);
    };

    const interval = setInterval(() => {
      void sendUpdate();
    }, 5000);

    const initialFlushTimeout = window.setTimeout(() => {
      void sendUpdate();
    }, 5000);

    void createActivityIfNeeded();

    document.addEventListener("click", handleEngagement);
    document.addEventListener("scroll", handleEngagement, { passive: true });
    document.addEventListener("keydown", handleEngagement);
    document.addEventListener("touchstart", handleEngagement, {
      passive: true,
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      clearInterval(interval);
      window.clearTimeout(initialFlushTimeout);
      void sendUpdate(true);
      persistState();
      document.removeEventListener("click", handleEngagement);
      document.removeEventListener("scroll", handleEngagement);
      document.removeEventListener("keydown", handleEngagement);
      document.removeEventListener("touchstart", handleEngagement);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [baseUrl, roomId, languageName, onFirstEngagement, resolvedStorageKey]);

  return null;
}
