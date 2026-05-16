/* eslint-disable import/prefer-default-export */
import { Activity } from '../activity';
import { IActivity } from '../activity/activity.interfaces';
import { Group } from '../group';
import Hotel from '../hotel/hotel.model';
import { IHotelDoc } from '../hotel/hotel.interfaces';
import { Link } from '../link';
import { ILinkDoc } from '../link/link.interfaces';
import { Room } from '../room';
import { IRoomDoc } from '../room/room.interfaces';
import { toDate } from '../utils/miscUtils';

const LANG_CODE_TO_NAME: Record<string, string> = {
  af: 'Afrikaans',
  sq: 'Albanian',
  ar: 'Arabic',
  hy: 'Armenian',
  az: 'Azerbaijani',
  eu: 'Basque',
  be: 'Belarusian',
  bn: 'Bengali',
  bs: 'Bosnian',
  bg: 'Bulgarian',
  ca: 'Catalan',
  zh: 'Chinese',
  hr: 'Croatian',
  cs: 'Czech',
  da: 'Danish',
  nl: 'Dutch',
  en: 'English',
  et: 'Estonian',
  fi: 'Finnish',
  fr: 'French',
  gl: 'Galician',
  ka: 'Georgian',
  de: 'German',
  el: 'Greek',
  gu: 'Gujarati',
  he: 'Hebrew',
  hi: 'Hindi',
  hu: 'Hungarian',
  is: 'Icelandic',
  id: 'Indonesian',
  ga: 'Irish',
  it: 'Italian',
  ja: 'Japanese',
  kn: 'Kannada',
  kk: 'Kazakh',
  ko: 'Korean',
  lv: 'Latvian',
  lt: 'Lithuanian',
  mk: 'Macedonian',
  ms: 'Malay',
  ml: 'Malayalam',
  mt: 'Maltese',
  mr: 'Marathi',
  mn: 'Mongolian',
  ne: 'Nepali',
  nb: 'Norwegian',
  no: 'Norwegian',
  pl: 'Polish',
  pt: 'Portuguese',
  pa: 'Punjabi',
  ro: 'Romanian',
  ru: 'Russian',
  sr: 'Serbian',
  sk: 'Slovak',
  sl: 'Slovenian',
  es: 'Spanish',
  sw: 'Swahili',
  sv: 'Swedish',
  ta: 'Tamil',
  te: 'Telugu',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  uz: 'Uzbek',
  vi: 'Vietnamese',
  cy: 'Welsh',
  yi: 'Yiddish',
};

const normalizeLanguage = (lang: string): string => {
  if (!lang) return 'Others';
  const trimmed = lang.trim();
  const lower = trimmed.toLowerCase();

  if (LANG_CODE_TO_NAME[lower]) return LANG_CODE_TO_NAME[lower] as string;

  const primaryCode = lower.split(/[-_]/)[0];

  if (primaryCode && LANG_CODE_TO_NAME[primaryCode]) {
    return LANG_CODE_TO_NAME[primaryCode] as string;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const normalizeDevice = (device: string): string => {
  if (!device) return 'Others';
  const lower = device.toLowerCase().trim();
  if (lower === 'ios' || lower === 'iphone' || lower === 'ipad') return 'iOS';
  if (lower === 'android') return 'Android';
  if (['desktop', 'windows', 'mac', 'macos', 'linux', 'pc'].includes(lower)) return 'Desktop';
  return device;
};

const getCounts = (activities: IActivity[], field: string): Record<string, number> => {
  if (activities.length === 0) return {};

  const counts = activities.reduce<Record<string, number>>((acc, activity) => {
    let key = activity.details[field] || 'Others';
    if (field === 'language') key = normalizeLanguage(key);
    if (field === 'device') key = normalizeDevice(key);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topThree = sortedEntries.slice(0, 3);
  const othersCount = sortedEntries.slice(3).reduce((sum, [, count]) => sum + count, 0);

  const finalCounts = Object.fromEntries(topThree);
  if (othersCount > 0) {
    finalCounts['Others'] = othersCount;
  }

  const total = Object.values(finalCounts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return {};

  return Object.fromEntries(
    Object.entries(finalCounts).map(([key, count]) => [key, Number(((count / total) * 100).toFixed(2))])
  );
};

const filterActivities = (activities: IActivity[], language?: string, device?: string) =>
  activities.filter((activity) => {
    if (language && normalizeLanguage(activity.details.language || '') !== language) return false;
    if (device && normalizeDevice(activity.details.device || '') !== device) return false;
    return true;
  });

const calculateStatsOverTime = (activities: IActivity[]) => {
  const stats: any = {
    taps: {},
    views: {},
    uniqueViews: {},
    timeSpent: {},
    bounceRate: {},
    engagedViews: {},
  };

  const uniqueViewsTracker: Record<string, Set<string>> = {};

  activities.forEach(({ action, createdAt, details }) => {
    const date = new Date(createdAt).toISOString().split('T')[0];
    if (!date) return;

    stats.views[date] = (stats.views[date] || 0) + (action === 'view' ? 1 : 0);
    stats.engagedViews[date] = (stats.engagedViews[date] || 0) + (action === 'view' && details.engaged ? 1 : 0);
    stats.timeSpent[date] = (stats.timeSpent[date] || 0) + (action === 'view' ? Number(details.time || 0) : 0);

    const visitorId = details.visitorId || '';
    if (!uniqueViewsTracker[date]) uniqueViewsTracker[date] = new Set();
    uniqueViewsTracker[date]!.add(visitorId);

    if (action === 'tap') {
      stats.taps[date] = (stats.taps[date] || 0) + 1;
    }
  });

  stats.uniqueViews = Object.fromEntries(Object.entries(uniqueViewsTracker).map(([date, ipSet]) => [date, ipSet.size]));
  stats.engagedViews = Object.fromEntries(
    Object.entries(stats.views).map(([date, totalViews]) => [
      date,
      Math.max(stats.engagedViews[date] || 0, Math.min(stats.taps[date] || 0, Number(totalViews))),
    ])
  );

  stats.bounceRate = Object.fromEntries(
    Object.entries(stats.views).map(([date, totalViews]) => [
      date,
      Number(totalViews) > 0
        ? Number((((Number(totalViews) - (stats.engagedViews[date] || 0)) / Number(totalViews)) * 100).toFixed(2))
        : 0,
    ])
  );

  return stats;
};

const getKeyMetrics = (activities: IActivity[]) => {
  const oneMinuteAgo = new Date().getTime() - 60 * 1000;

  const viewActivities = activities.filter((a) => a.action === 'view');
  const recentActivities = viewActivities.filter((a) => new Date(a.updatedAt).getTime() > oneMinuteAgo);
  const tapActivities = activities.filter((a) => a.action === 'tap');

  const views = viewActivities.length;
  const liveViews = recentActivities.length;
  const taps = tapActivities.length;
  const rawEngagedViews = viewActivities.filter((a) => a.details.engaged).length;
  const engagedViews = Math.max(rawEngagedViews, Math.min(taps, views));

  const uniqueViews = new Set(viewActivities.map(({ details }) => details.visitorId || '')).size;
  const timeSpent: number =
    views > 0
      ? Number((viewActivities.reduce((sum, { details }) => sum + Number(details.time || 0), 0) / views).toFixed(0))
      : 0;
  const bounceRate: number = views > 0 ? Number((((views - engagedViews) / views) * 100).toFixed(0)) : 0;

  const links: Record<string, number> = {};
  tapActivities.forEach((a) => {
    const id: string | undefined = a.details.link;
    if (id) {
      links[id] = (links[id] || 0) + 1;
    }
  });
  const topPerformingLink =
    Object.keys(links).length > 0
      ? Object.keys(links).reduce((maxId, id) => {
          return links[maxId] && links[id]! > links[maxId]! ? id : maxId;
        }, Object.keys(links)[0] || '')
      : null;

  const socialLinks: Record<string, number> = {};
  tapActivities.forEach((a) => {
    const id: string | undefined = a.details.socialLink;
    if (id) {
      socialLinks[id] = (socialLinks[id] || 0) + 1;
    }
  });

  const topPerformingSocialLink =
    Object.keys(socialLinks).length > 0
      ? Object.keys(socialLinks).reduce((maxId, id) => {
          return socialLinks[maxId] && socialLinks[id]! > socialLinks[maxId]! ? id : maxId;
        }, Object.keys(socialLinks)[0] || '')
      : null;

  return {
    views,
    liveViews,
    taps,
    uniqueViews,
    engagedViews,
    timeSpent,
    bounceRate,
    viewsByLanguages: getCounts(viewActivities, 'language'),
    viewsByDevices: getCounts(viewActivities, 'device'),
    topPerformingLink,
    topPerformingSocialLink,
  };
};

const enrichRoomsWithStats = (rooms: IRoomDoc[], activities: IActivity[]) => {
  return rooms.map((room) => {
    const roomActivities = activities.filter((a) => a.details.room === room.id);
    const keyMetrics = getKeyMetrics(roomActivities);
    return { ...room.toJSON(), ...keyMetrics };
  });
};

const enrichLinksWithStats = (links: ILinkDoc[], activities: IActivity[]) => {
  const tapActivities = activities.filter((a) => a.action === 'tap');
  return links.map((link) => {
    const tapCount = tapActivities.filter((a) => a.details.link === link.id).length;
    return { ...link.toJSON(), taps: tapCount };
  });
};

const enrichServiceButtonsWithStats = (rooms: IRoomDoc[], activities: IActivity[]) => {
  const tapActivities = activities.filter((a) => a.action === 'tap' && a.details.button);

  return rooms.flatMap((room) => {
    const services = [
      {
        key: 'housekeeping',
        title: room.housekeeping?.mainButtonText || 'Housekeeping Request',
        isActive: room.housekeeping?.isActive,
      },
      {
        key: 'maintenance',
        title: room.maintenance?.mainButtonText || 'Report Maintenance Issue',
        isActive: room.maintenance?.isActive,
      },
    ];

    return services
      .filter((service) => service.isActive)
      .map((service) => ({
        id: `${room.id}:${service.key}`,
        title: service.title,
        type: service.key,
        room: room.toJSON(),
        group: undefined,
        value: '',
        items: [],
        sections: [],
        imageType: 'none',
        isActive: true,
        data: {},
        taps: tapActivities.filter((a) => a.details.room === room.id && a.details.button === service.key).length,
      }));
  });
};

const enrichSocialLinksWithStats = (socialLinks: string[], activities: IActivity[]) => {
  const tapActivities = activities.filter((a) => a.action === 'tap');
  return socialLinks?.map((link) => {
    const socialLinkTaps = tapActivities.filter((a) => link.includes(a.details.socialLink || '')).length;
    return { title: link.replace('mailto:', ''), taps: socialLinkTaps };
  });
};

const calculateChange = (current: any, previous: any) => {
  const calculatePercentage = (currentValue: number, previousValue: number): number => {
    if (previousValue === 0) return currentValue === 0 ? 0 : 100; // Handle division by zero
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  return {
    views: calculatePercentage(current.views, previous.views),
    liveViews: calculatePercentage(current.liveViews, previous.liveViews),
    taps: calculatePercentage(current.taps, previous.taps),
    uniqueViews: calculatePercentage(current.uniqueViews, previous.uniqueViews),
    timeSpent: calculatePercentage(current.timeSpent, previous.timeSpent),
    bounceRate: calculatePercentage(current.bounceRate, previous.bounceRate),
  };
};

const getCheckinUsageSummary = (activities: IActivity[]) => {
  const checkinActivities = activities.filter(
    (activity) => activity.action === 'tap' && activity.details.button === 'checkin' && activity.details.source === 'sidebar'
  );

  return {
    opens: checkinActivities.length,
    uniqueHotels: new Set(checkinActivities.map((activity) => String(activity.hotel))).size,
    lastUsedAt: checkinActivities[0]?.createdAt ?? null,
  };
};

export const getHotelInsights = async ({
  hotel,
  startDate,
  endDate,
  language,
  device,
}: {
  hotel: IHotelDoc;
  startDate: string;
  endDate: string;
  language: string;
  device: string;
}) => {
  const { start, end } = toDate({ startDate, endDate });
  const timeSpan = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - timeSpan - 1);
  const prevEnd = new Date(end.getTime() - timeSpan - 1);

  const pastStart = new Date(end);
  pastStart.setDate(end.getDate() - 6);

  // Fetch data concurrently
  const [rooms, groups] = await Promise.all([
    Room.find({ hotel: hotel.id }).populate('group'),
    Group.find({ hotel: hotel.id }),
  ]);

  const roomIds = rooms.map((r) => r.id);
  const groupIds = groups.map((g) => g.id);

  const ACTIVITY_LIMIT = 50_000;

  // Fetch links and activities concurrently
  const [links, activities] = await Promise.all([
    Link.find({ $or: [{ room: { $in: roomIds } }, { group: { $in: groupIds } }] })
      .populate('room')
      .populate('group'),
    Activity.find({
      user: hotel.user,
      hotel: hotel.id,
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT),
  ]);

  const prevActivitiesRaw = await Activity.find({
    user: hotel.user,
    hotel: hotel.id,
    createdAt: { $gte: prevStart, $lte: prevEnd },
  })
    .sort({ createdAt: -1 })
    .limit(ACTIVITY_LIMIT);

  const pastActivitiesRaw =
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24) < 2
      ? await Activity.find({
          user: hotel.user,
          hotel: hotel.id,
          createdAt: { $gte: pastStart, $lte: end },
        })
          .sort({ createdAt: -1 })
          .limit(ACTIVITY_LIMIT)
      : [];

  const normalizedLanguage = language ? normalizeLanguage(language) : undefined;
  const normalizedDevice = device ? normalizeDevice(device) : undefined;
  const filteredActivities = filterActivities(activities, normalizedLanguage, normalizedDevice);
  const prevActivities = filterActivities(prevActivitiesRaw, normalizedLanguage, normalizedDevice);
  const pastActivities = filterActivities(pastActivitiesRaw, normalizedLanguage, normalizedDevice);

  const keyMetrics = getKeyMetrics(filteredActivities);
  const updatedRooms = enrichRoomsWithStats(rooms, filteredActivities);
  const updatedLinks = [
    ...enrichLinksWithStats(links, filteredActivities),
    ...enrichServiceButtonsWithStats(rooms, filteredActivities),
  ];
  const updatedSocialLinks = enrichSocialLinksWithStats(hotel.socialLinks || [], filteredActivities);

  const prevKeyMetrics = getKeyMetrics(prevActivities);
  const change = calculateChange(keyMetrics, prevKeyMetrics);

  const overTime = calculateStatsOverTime(pastActivities.length > 0 ? pastActivities : filteredActivities);

  const topRoom: any =
    updatedRooms.length > 0
      ? updatedRooms.reduce((max, current) => (current.views > (max.views || 0) ? current : max))
      : null;
  const topLink: any =
    updatedLinks.length > 0 ? updatedLinks.reduce((max, current) => (current.taps > (max.taps || 0) ? current : max)) : null;
  const checkinUsage = getCheckinUsageSummary(filteredActivities);

  return {
    keyMetrics,
    links: updatedLinks,
    rooms: updatedRooms,
    socialLinks: updatedSocialLinks,
    overTime,
    change,
    activities: filteredActivities,
    topRoom,
    topLink,
    checkinUsage,
  };
};

const enrichHotelsWithStats = (hotels: IHotelDoc[], activities: IActivity[]) => {
  return hotels.map((hotel) => {
    const hotelActivities = activities.filter((a) => String(a.hotel) === String(hotel.id));
    const viewActivities = hotelActivities.filter((a) => a.action === 'view');
    const checkinActivities = hotelActivities.filter(
      (activity) => activity.action === 'tap' && activity.details.button === 'checkin' && activity.details.source === 'sidebar'
    );
    const views = viewActivities.length;

    const redirectActivities = hotelActivities.filter((a) => a.details.logo);
    const redirects = redirectActivities.length;

    return {
      ...hotel.toJSON(),
      views,
      redirects,
      checkinOpens: checkinActivities.length,
      checkinLastUsedAt: checkinActivities[0]?.createdAt ?? null,
    };
  });
};

export const getAdminInsights = async ({
  startDate,
  endDate,
  reqUser,
}: {
  startDate: string;
  endDate: string;
  reqUser: any;
}) => {
  const { start, end } = toDate({ startDate, endDate });
  const timeSpan = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - timeSpan - 1);
  const prevEnd = new Date(end.getTime() - timeSpan - 1);

  const pastStart = new Date(end);
  pastStart.setDate(end.getDate() - 6);

  const filter = reqUser.role === 'manager' ? { manager: reqUser.id } : {};
  const hotels = await Hotel.find(filter);
  const hotelIds = hotels.map((h) => h.id);

  // Fetch rooms and groups for the specified hotel
  const [rooms, groups] = await Promise.all([Room.find({ hotel: { $in: hotelIds } }).populate('group'), Group.find({})]);

  const roomIds = rooms.map((r) => r.id);
  const groupIds = groups.map((g) => g.id);

  const ACTIVITY_LIMIT = 50_000;

  // Fetch links and activities concurrently
  const [links, activities] = await Promise.all([
    Link.find({ $or: [{ room: { $in: roomIds } }, { group: { $in: groupIds } }] })
      .populate('room')
      .populate('group'),
    Activity.find({
      hotel: { $in: hotelIds },
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT),
  ]);

  const prevActivities = await Activity.find({
    hotel: { $in: hotelIds },
    createdAt: { $gte: prevStart, $lte: prevEnd },
  })
    .sort({ createdAt: -1 })
    .limit(ACTIVITY_LIMIT);

  const pastActivities =
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24) < 2
      ? await Activity.find({
          hotel: { $in: hotelIds },
          createdAt: { $gte: pastStart, $lte: end },
        })
          .sort({ createdAt: -1 })
          .limit(ACTIVITY_LIMIT)
      : [];

  const keyMetrics = getKeyMetrics(activities);
  const updatedRooms = enrichRoomsWithStats(rooms, activities);
  const updatedLinks = [...enrichLinksWithStats(links, activities), ...enrichServiceButtonsWithStats(rooms, activities)];
  const socialLinks = hotels.reduce<string[]>((acc, hotel) => {
    const uniqueLinks = hotel.socialLinks?.filter((link) => !acc.includes(link)) || [];
    return [...acc, ...uniqueLinks];
  }, []);
  const updatedSocialLinks = enrichSocialLinksWithStats(socialLinks, activities);

  const prevKeyMetrics = getKeyMetrics(prevActivities);
  const change = calculateChange(keyMetrics, prevKeyMetrics);

  const overTime = calculateStatsOverTime(pastActivities.length > 0 ? pastActivities : activities);

  const topRoom: any =
    updatedRooms.length > 0
      ? updatedRooms.reduce((max, current) => (current.views > (max.views || 0) ? current : max))
      : null;
  const topLink: any =
    updatedLinks.length > 0 ? updatedLinks.reduce((max, current) => (current.taps > (max.taps || 0) ? current : max)) : null;

  const updatedHotels = enrichHotelsWithStats(hotels, activities);
  const checkinUsage = getCheckinUsageSummary(activities);

  return {
    keyMetrics,
    links: updatedLinks,
    rooms: updatedRooms,
    socialLinks: updatedSocialLinks,
    overTime,
    change,
    activities,
    topRoom,
    topLink,
    hotels: updatedHotels,
    checkinUsage,
  };
};
