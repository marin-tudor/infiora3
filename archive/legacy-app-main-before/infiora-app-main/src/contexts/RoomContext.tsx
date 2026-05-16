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
import { translateObject } from "@/utils/translationUtils";
import defaultLanguages from "@/data/languages.json";
import useDialog, { DialogReturnType } from "@/hooks/useDialog";

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

  isDialogOpen: boolean;
}

interface RoomData {
  room?: IRoom;
  links?: ILink[];
  activityId?: string;
}

// Get or generate unique visitor ID
const getOrSetVisitorID = () => {
  let visitorID = localStorage.getItem("visitorID");
  if (!visitorID) {
    visitorID = crypto.randomUUID();
    localStorage.setItem("visitorID", visitorID);
  }
  return visitorID;
};

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

  const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
  const roomId = params.id as string;

  const wifiDialog = useDialog<ILink>();
  const textDialog = useDialog<string>();
  const blogDialog = useDialog<ILink>();
  const popupDialog = useDialog<null>();
  const newsletterDialog = useDialog<null>();
  const feedbackDialog = useDialog<null>();

  const isDialogOpen = useMemo(
    () =>
      wifiDialog.isOpen ||
      textDialog.isOpen ||
      blogDialog.isOpen ||
      popupDialog.isOpen ||
      newsletterDialog.isOpen ||
      feedbackDialog.isOpen,
    [
      wifiDialog.isOpen,
      textDialog.isOpen,
      blogDialog.isOpen,
      popupDialog.isOpen,
      newsletterDialog.isOpen,
      feedbackDialog.isOpen,
    ]
  );

  // -------------------- Language & Translation --------------------
  const getTranslations = useCallback(
    async (data: RoomData, lang: ILanguage) => {
      try {
        if (!dictionary[lang.code]) {
          const translated = await translateObject(data, lang.code);
          setDictionary((prev) => ({ ...prev, [lang.code]: translated }));
        }
        setLanguage(lang);
      } catch (err) {
        console.error("Error translating room data:", err);
      }
    },
    [dictionary]
  );

  const handleSelectLanguage = useCallback(
    async (lang: ILanguage) => {
      await getTranslations(dictionary.default, lang);
    },
    [dictionary.default, getTranslations]
  );

  const updateLanguages = useCallback(() => {
    const browserLang = getBrowserLanguage();
    const langs = defaultLanguages.some((l) => l.code === browserLang.code)
      ? defaultLanguages
      : [browserLang, ...defaultLanguages];
    setLanguages(langs);
    setLanguage(browserLang);
    return browserLang;
  }, []);

  // -------------------- Fetch Room --------------------
  const fetchRoomData = useCallback(async () => {
    setIsLoading(true);
    try {
      const lang = updateLanguages();
      const device = isDesktop ? "Desktop" : isIOS ? "iOS" : "Android";
      const visitorId = getOrSetVisitorID();

      const fetchRoom = async (
        roomId: string,
        params: Record<string, string>
      ): Promise<{ activityId?: string; links?: any[]; room: any } | null> => {
        const url = new URL(`${baseUrl}/v1/rooms/${roomId}`);
        url.search = new URLSearchParams(params).toString();

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch room data");

        const { activityId, links, ...room } = await response.json();
        if (!room.hotel.isActive) return null;
        delete room.group;
        return { activityId, links, room };
      };

      const data = await fetchRoom(roomId, {
        action: "view",
        visitorId,
        device,
        language: lang.name,
      });

      if (!data) {
        router.replace("/not-found");
        return;
      }

      setDictionary({ default: data });
      await getTranslations(data, lang);
    } catch (err) {
      console.error("Error fetching room:", err);
      router.replace("/not-found");
    } finally {
      setIsLoading(false);
    }
  }, [roomId, router, getTranslations, updateLanguages, baseUrl]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchRoomData();
    }
  }, [fetchRoomData]);

  // -------------------- Popup & Newsletter Dialogs --------------------
  useEffect(() => {
    const roomData = dictionary[language?.code || "default"]?.room;
    if (!roomData || isDialogOpen) return;

    const timers: NodeJS.Timeout[] = [];

    if (roomData.popup?.isActive && !hasShownDialog.current.popup) {
      hasShownDialog.current.popup = true;
      timers.push(
        setTimeout(() => {
          if (!isDialogOpen) popupDialog.open();
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
          if (!isDialogOpen) newsletterDialog.open();
        }, 1000)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [dictionary, language, isDialogOpen, popupDialog, newsletterDialog]);

  // -------------------- Context Value --------------------
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
      isDialogOpen,
    }),
    [
      dictionary,
      language,
      isLoading,
      languages,
      handleSelectLanguage,
      wifiDialog,
      textDialog,
      blogDialog,
      popupDialog,
      newsletterDialog,
      feedbackDialog,
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
