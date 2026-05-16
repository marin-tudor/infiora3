import { format, parseISO, startOfHour } from 'date-fns';
import { FieldErrors } from 'react-hook-form';
import { toast } from 'react-toastify';

export const isNullOrEmpty = (value: any) => {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    value === 'null'
  );
};

export const removeNullFields = (obj: any): any => {
  if (Array.isArray(obj)) {
    // If obj is an array, process its elements
    return obj
      .map((item) =>
        typeof item === 'object' && item !== null
          ? removeNullFields(item)
          : item
      )
      .filter(
        (item) => item !== null && item !== undefined && item !== ''
      );
  } else if (typeof obj === 'object' && obj !== null) {
    // If obj is a plain object, process its keys
    const result: Record<string, any> = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        // Recurse for nested objects or arrays
        const cleanedValue = removeNullFields(value);

        if (
          (Array.isArray(cleanedValue) && cleanedValue.length > 0) ||
          (typeof cleanedValue === 'object' &&
            Object.keys(cleanedValue).length > 0) ||
          (!Array.isArray(cleanedValue) &&
            typeof cleanedValue !== 'object')
        ) {
          result[key] = cleanedValue;
        }
      } else if (
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        // Add non-null, non-empty values to the result
        result[key] = value;
      }
    });

    return result;
  } else {
    // If obj is neither an array nor an object, return it unchanged
    return obj;
  }
};

export const getInitials = (string: string) =>
  string
    .split(/\s/)
    .reduce((response, word) => (response += word.slice(0, 1)), '');

export const isFloat = (n: number) => {
  return typeof n === 'number' && n % 1 !== 0;
};

export const downloadBlob = (
  content: string,
  filename: string,
  contentType: string
): void => {
  // Create a blob
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);

  // Create a link to download it
  const pom = document.createElement('a');

  pom.href = url;
  pom.setAttribute('download', filename);
  pom.click();
};

export const filterNotNullOrEmptyFields = (
  inputObj: Record<string, any>
): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const key in inputObj) {
    if (inputObj.hasOwnProperty(key)) {
      const value = inputObj[key];

      if (value !== null && value !== undefined && value !== '') {
        result[key] = value;
      }
    }
  }

  return result;
};

export const toSearchParams = (searchParams: any) => {
  const params = new URLSearchParams();

  for (const key in searchParams) {
    if (searchParams.hasOwnProperty(key)) {
      params.append(key, searchParams[key]);
    }
  }

  return params.toString();
};

export const fetchFile = async (
  url: string
): Promise<Blob | null> => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await response.blob();

    return blob;
  } catch (error) {
    console.error('Error fetching file:', error);

    return null;
  }
};

export const copyToClipboard = (string: string) => {
  navigator.clipboard
    .writeText(string)
    .then(() => {
      toast.success('Copied to clipboard');
    })
    .catch((err) => {
      console.error('Failed to copy: ', err);
    });
};

export const openPopupWindow = (
  url: string,
  onCloseCallback: any
) => {
  const width = 600;
  const height = 800;
  const left = window?.screenX + window?.outerWidth / 2 - width / 2;
  const top = window?.screenY + window?.outerHeight / 2 - height / 2;

  const popupWindow = window?.open(
    url,
    '',
    `width=${width},height=${height},top=${top},left=${left}`
  );

  // Check if the popup was blocked
  if (!popupWindow) {
    alert('Popup blocked. Please allow popups for this site.');
  }

  // Check if the new window is closed
  const checkClosedInterval = setInterval(() => {
    if (popupWindow && popupWindow?.closed) {
      clearInterval(checkClosedInterval);

      if (typeof onCloseCallback === 'function') {
        onCloseCallback();
      }
    }
  }, 500);
};

export const getGreeting = () => {
  const currentHour = new Date().getHours();

  if (currentHour < 12) {
    return 'Good morning';
  } else if (currentHour < 18) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
};

export const getLockState = (isGroupLocked?: boolean) => {
  if (isGroupLocked === true) {
    return 'group';
  } else {
    return;
  }
};

export const getLockMessage = (
  dictionary: any,
  lockState?: string
) => {
  switch (lockState) {
    case 'group':
      return dictionary.messages.groupLocked;
    default:
  }
};

export const getErrorMessage = (
  errors: FieldErrors,
  name: string,
  dictionary?: any
): string | null => {
  const error = errors[name];

  if (!error) return null;

  const d = dictionary || {
    validations: {
      trim: 'No leading or trailing spaces allowed.',
      required: 'Field is required.',
      min5: 'Must be at least 5 characters.',
      min8: 'At least 8 characters.',
      min3: 'Must be at least 3 characters long.',
      max50: 'Must be at most 50 characters.',
      max32: 'No more than 32 characters.',
      max100: 'Cannot be more than 50 characters long.',
      max255: 'Must be at most 255 characters.',
      wholeNumber: 'Must be a non-negative number.',
      email: 'Invalid email format.',
      url: 'Invalid url format.',
      isNotEmpty: 'No spaces allowed.',
      hasLetter: 'Must include at least one letter.',
      hasNumber: 'Must include at least one number.',
      validSpecialChars:
        'Only special characters !@#$%^&*()_+={}|\\:;"\',.?/<>- are allowed.',
      matchPassword: 'Must match password.',
      validUsername:
        'Only letters, numbers, dots, underscores, and hyphens are allowed.',
    },
  };
  if (typeof error.message === 'string') {
    return d.validations[error.message];
  }

  return 'Invalid input';
};

export const hasKey = (obj: any, key: string) => {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
};

export const toCamelCase = (str: string): string => {
  return str
    ?.replace(/[-_ ]+./g, (match) =>
      match.charAt(match.length - 1).toUpperCase()
    ) // Handle delimiters
    ?.replace(/^[A-Z]/, (match) => match.toLowerCase()); // Ensure the first character is lowercase
};

export const generateGradient = (
  color: string,
  direction?: 'up' | 'down'
) => {
  const deg = direction === 'down' ? '180deg' : '0deg';
  const shift = { r: 20, g: 154, b: 0 };

  // Parse the base color
  const r = parseInt(color.substring(1, 3), 16); // Extract R
  const g = parseInt(color.substring(3, 5), 16); // Extract G
  const b = parseInt(color.substring(5, 7), 16); // Extract B
  // Generate the second color by shifting each component
  const r2 = Math.min(255, r + shift.r); // Shift R
  const g2 = Math.min(255, g + shift.g); // Shift G
  const b2 = Math.min(255, b + shift.b); // Shift B
  // Convert back to HEX
  const secondColor = `#${r2.toString(16).padStart(2, '0')}${g2
    .toString(16)
    .padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;

  // Return the CSS gradient
  return `linear-gradient(${deg}, ${color}, ${secondColor})`;
};

export const formatTime = (seconds: number): string => {
  if (seconds < 0) return '0'; // Handle invalid input

  const totalMinutes = Math.floor(seconds / 60); // Convert total seconds to minutes
  const totalSeconds = seconds % 60; // Calculate remaining seconds
  const days = Math.floor(totalMinutes / (24 * 60)); // Calculate days
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60); // Calculate remaining hours
  const minutes = totalMinutes % 60; // Calculate remaining minutes

  const daysPart = days > 0 ? `${days.toFixed(0)}d` : '';
  const hoursPart = hours > 0 ? `${hours.toFixed(0)}h` : '';
  const minutesPart = minutes > 0 ? `${minutes.toFixed(0)}m` : '';
  const secondsPart =
    totalSeconds > 0 ? `${totalSeconds.toFixed(0)}s` : '';

  // Combine parts with appropriate spacing and commas
  return [daysPart, hoursPart, minutesPart, secondsPart]
    .filter(Boolean)
    .join(', ');
};

export const toDate = ({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) => {
  // Calculate default start date as three months ago
  const defaultStart = new Date();

  defaultStart.setMonth(defaultStart.getMonth() - 3);
  defaultStart.setHours(0, 0, 0, 0); // Start of the day

  // Parse and validate the start date or use default
  const start =
    startDate && !Number.isNaN(Date.parse(startDate))
      ? new Date(startDate)
      : defaultStart;

  // Calculate default end date as the next day
  const defaultEnd = new Date();

  defaultEnd.setDate(defaultEnd.getDate() + 1); // Next day
  defaultEnd.setHours(23, 59, 59, 999); // End of the day

  // Parse and validate the end date or use default
  const end =
    endDate && !Number.isNaN(Date.parse(endDate))
      ? new Date(endDate)
      : defaultEnd;

  return { startDate: start, endDate: end };
};

export const getTop = (temp: any, metric: string) => {
  if (!temp || temp.length === 0) {
    return null;
  }

  const top = temp.reduce((prev: any, current: any) =>
    current[metric] > prev[metric] ? current : prev
  );

  return top;
};

export const getPeakTime = (
  activities?: { createdAt: string }[]
): string | null => {
  if (!activities || activities.length === 0) {
    return 'N/A'; // No data available
  }

  // Group activities by hour
  const activityGroups = activities.reduce<Record<string, number>>(
    (acc, activity) => {
      const hour = format(
        startOfHour(parseISO(activity.createdAt)),
        'yyyy-MM-dd HH:00'
      );

      acc[hour] = (acc[hour] || 0) + 1; // Increment the count for the hour

      return acc;
    },
    {}
  );

  // Sort the groups by hour
  const sortedHours = Object.entries(activityGroups).sort(
    ([timeA], [timeB]) =>
      new Date(timeA).getTime() - new Date(timeB).getTime()
  );

  // Find the peak range
  let peakRangeStart = '';
  let peakRangeEnd = '';
  let maxCount = 0;

  let currentStart = '';
  let currentEnd = '';
  let currentCount = 0;

  sortedHours.forEach(([time, count], index) => {
    const currentHour = new Date(time).getTime();

    if (
      index === 0 ||
      currentHour ===
        new Date(sortedHours[index - 1][0]).getTime() + 60 * 60 * 1000
    ) {
      // Extend the current range
      currentEnd = time;
      currentCount += count;

      if (currentStart === '') {
        currentStart = time;
      }
    } else {
      // Reset the current range
      if (currentCount > maxCount) {
        maxCount = currentCount;
        peakRangeStart = currentStart;
        peakRangeEnd = currentEnd;
      }

      currentStart = time;
      currentEnd = time;
      currentCount = count;
    }
  });

  // Final check after the loop
  if (currentCount > maxCount) {
    peakRangeStart = currentStart;
    peakRangeEnd = currentEnd;
  }

  // Format the time range
  const startFormatted = format(parseISO(peakRangeStart), 'HH:mm');
  const endFormatted = format(parseISO(peakRangeEnd), 'HH:mm');

  return `${startFormatted} - ${endFormatted}`;
};

export const getSeriesData = (obj?: Record<string, any>) => {
  if (!obj) return [];

  return Object.keys(obj).map((x) => ({
    x,
    y: obj[x],
  }));
};

export const calculateChange = (
  current?: number,
  previous?: number
) => {
  const c = current || 0;
  const p = previous || 0;

  if (p === 0 && c === 0) return 0;
  if (p === 0) return 100;
  if (c === 0) return -100;

  return ((c - p) / p) * 100;
};
