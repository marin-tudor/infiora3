"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useParams } from "next/navigation";
import { ILanguage, ILink, IRoom } from "@/types";
import { isIOS, isDesktop } from "react-device-detect";
import { getBrowserLanguage } from "@/utils/miscUtils";
import defaultLanguages from "@/data/languages.json";
import useDialog, { DialogReturnType } from "@/hooks/useDialog";
import { getAnonymousVisitorId } from "@/lib/visitorIdentity";

interface RoomContextType {
  dictionary?: Record<string, any>;
  room?: IRoom;
  links?: ILink[];
  activityId?: string;
  isLoading: boolean;
  languages: ILanguage[];
  language: ILanguage;
  setLanguage: (lang: ILanguage) => Promise<void>;

  wifiDialog: DialogReturnType<ILink>;
  textDialog: DialogReturnType<string>;
  blogDialog: DialogReturnType<ILink>;

  popupDialog: DialogReturnType<null>;
  newsletterDialog: DialogReturnType<null>;
  feedbackDialog: DialogReturnType<null>;
  surveyDialog: DialogReturnType<null>;

  isDialogOpen: boolean;
}

interface RoomData {
  availableTranslationLanguages?: string[];
  translationLanguage?: string;
  room?: IRoom;
  links?: ILink[];
  activityId?: string;
  hotel?: { isActive?: boolean };
}

// Get or generate a session-only visitor ID — dies when tab closes, GDPR-safe
const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<Record<string, any>>({});
  const [language, setLanguage] = useState<ILanguage>();
  const [languages, setLanguages] = useState<ILanguage[]>([]);
  const hasFetched = useRef(false);
  const hasShownDialog = useRef<{ popup?: boolean; newsletter?: boolean }>({});
  const dictionaryRef = useRef<Record<string, any>>({});
  const isDialogOpenRef = useRef(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  const roomId = params.id as string;

  const wifiDialog = useDialog<ILink>();
  const textDialog = useDialog<string>();
  const blogDialog = useDialog<ILink>();
  const popupDialog = useDialog<null>();
  const newsletterDialog = useDialog<null>();
  const feedbackDialog = useDialog<null>();
  const surveyDialog = useDialog<null>();

  const getAvailableLanguages = useCallback((fallbackCode?: string) => {
    const fallback =
      defaultLanguages.find((lang) => lang.code.toLowerCase() === String(fallbackCode || "").toLowerCase()) ||
      defaultLanguages.find((lang) => lang.code === "en");

    if (!fallback || defaultLanguages.some((lang) => lang.code === fallback.code)) {
      return defaultLanguages;
    }

    return [fallback, ...defaultLanguages];
  }, []);

  const getEffectiveLanguage = useCallback(
    (data: RoomData, preferredLanguage?: ILanguage) => {
      const available = getAvailableLanguages(data.translationLanguage || data.room?.translationLanguage);

      const effectiveCode =
        data.translationLanguage ||
        data.room?.translationLanguage ||
        preferredLanguage?.code ||
        available[0]?.code ||
        'en';

      const effective = available.find((lang) => lang.code === effectiveCode) || available[0] || preferredLanguage;

      return {
        available,
        effective,
      };
    },
    [getAvailableLanguages]
  );

  const isDialogOpen = useMemo(
    () =>
      wifiDialog.isOpen ||
      textDialog.isOpen ||
      blogDialog.isOpen ||
      popupDialog.isOpen ||
      newsletterDialog.isOpen ||
      feedbackDialog.isOpen ||
      surveyDialog.isOpen,
    [
      wifiDialog.isOpen,
      textDialog.isOpen,
      blogDialog.isOpen,
      popupDialog.isOpen,
      newsletterDialog.isOpen,
      feedbackDialog.isOpen,
      surveyDialog.isOpen,
    ]
  );

  // Keep refs in sync — these are read inside timers/intervals to avoid stale closures
  isDialogOpenRef.current = isDialogOpen;
  useEffect(() => {
    dictionaryRef.current = dictionary;
  }, [dictionary]);

  // -------------------- Language & Translation --------------------
  const fetchRoomPayload = useCallback(
    async (lang: ILanguage, trackView: boolean): Promise<RoomData | null> => {
      const url = new URL(`${baseUrl}/v1/rooms/${roomId}`);
      url.searchParams.set("lang", lang.code);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch room data");

      const data = (await response.json()) as RoomData;
      if (!data.hotel?.isActive) return null;

      if (trackView) {
        const device = isDesktop ? "Desktop" : isIOS ? "iOS" : "Android";
        const visitorId = getAnonymousVisitorId();

        try {
          const trackingResponse = await fetch(`${baseUrl}/v1/rooms/${roomId}/activity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "view",
              visitorId,
              device,
              language: lang.name,
            }),
          });

          if (trackingResponse.ok) {
            const trackingData = (await trackingResponse.json()) as { activityId?: string };
            data.activityId = trackingData.activityId;
          }
        } catch {
          // Tracking is best-effort only.
        }
      }

      return data;
    },
    [baseUrl, roomId]
  );

  const getTranslations = useCallback(
    async (lang: ILanguage) => {
      try {
        if (!dictionaryRef.current[lang.code]) {
          const translated = await fetchRoomPayload(lang, false);
          if (!translated) {
            router.replace("/not-found");
            return;
          }

          const { available, effective } = getEffectiveLanguage(translated, lang);
          setLanguages(available);

          if (!effective) {
            return;
          }

          setDictionary((prev) => ({ ...prev, [effective.code]: translated }));
          setLanguage(effective);
          return;
        }

        setLanguage(lang);
      } catch (err) {
        console.error("Error loading translated room data:", err);
        setLanguage(lang);
      }
    },
    [fetchRoomPayload, router]
  );

  const handleSelectLanguage = useCallback(
    async (lang: ILanguage) => {
      await getTranslations(lang);
    },
    [getTranslations]
  );

  const updateLanguages = useCallback(() => {
    const browserLang = getBrowserLanguage();
    const langs = defaultLanguages.some((l) => l.code === browserLang.code) ? defaultLanguages : [browserLang, ...defaultLanguages];
    setLanguages(langs);
    setLanguage(browserLang);
    return browserLang;
  }, []);

  // -------------------- Fetch Room --------------------
  const fetchRoomData = useCallback(async () => {
    setIsLoading(true);
    try {
      const lang = updateLanguages();
      const data = await fetchRoomPayload(lang, true);

      if (!data) {
        router.replace("/not-found");
        return;
      }

      const { available, effective } = getEffectiveLanguage(data, lang);
      if (!effective) {
        router.replace("/not-found");
        return;
      }

      setLanguages(available);
      setDictionary({ default: data, [effective.code]: data });
      setLanguage(effective);
    } catch (err) {
      console.error("Error fetching room:", err);
      router.replace("/not-found");
    } finally {
      setIsLoading(false);
    }
  }, [fetchRoomPayload, router, updateLanguages]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchRoomData();
    }
  }, [fetchRoomData]);

  // -------------------- Popup & Newsletter Dialogs --------------------
  const openPopupDialog = popupDialog.open;
  const openNewsletterDialog = newsletterDialog.open;

  useEffect(() => {
    const roomData = dictionary[language?.code || "default"]?.room;
    if (!roomData || isDialogOpen) return;

    const timers: NodeJS.Timeout[] = [];

    if (roomData.popup?.isActive && !hasShownDialog.current.popup) {
      hasShownDialog.current.popup = true;
      timers.push(
        setTimeout(() => {
          if (!isDialogOpenRef.current) openPopupDialog();
        }, 1000)
      );
    }

    if (
      roomData.newsletter?.isActive &&
      roomData.newsletter.type === "popup" &&
      !hasShownDialog.current.newsletter
    ) {
      hasShownDialog.current.newsletter = true;
      timers.push(
        setTimeout(() => {
          if (!isDialogOpenRef.current) openNewsletterDialog();
        }, 1000)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [dictionary, language, isDialogOpen, openPopupDialog, openNewsletterDialog]);

  // -------------------- Context Value --------------------
  // Dialog objects are new references on every render, so use only their
  // changing parts (isOpen, content) as deps — the .open/.close functions
  // are stable (useCallback []) and don't need to be deps.
  const contextValue = useMemo(
    () => ({
      ...dictionary["default"],
      ...dictionary[language?.code || "default"],
      isLoading,
      languages,
      language,
      setLanguage: handleSelectLanguage,
      wifiDialog,
      textDialog,
      blogDialog,
      popupDialog,
      newsletterDialog,
      feedbackDialog,
      surveyDialog,
      isDialogOpen,
    }),
    [
      dictionary,
      language,
      isLoading,
      languages,
      handleSelectLanguage,
      // dialog stable fns (open/close) are useCallback [] — no need to list them
      // only track the parts that actually change
      wifiDialog.isOpen, wifiDialog.content,
      textDialog.isOpen, textDialog.content,
      blogDialog.isOpen, blogDialog.content,
      popupDialog.isOpen, popupDialog.content,
      newsletterDialog.isOpen, newsletterDialog.content,
      feedbackDialog.isOpen, feedbackDialog.content,
      surveyDialog.isOpen, surveyDialog.content,
      isDialogOpen,
    ]
  );

  return (
    <RoomContext.Provider value={contextValue}>{children}</RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error("useRoom must be used within a RoomProvider");
  return context;
};
