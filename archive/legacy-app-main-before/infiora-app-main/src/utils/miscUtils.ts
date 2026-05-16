import { toast } from 'react-toastify';
import languages from '@/data/languages1.json';
import { ILanguage, IRoom } from '@/types';

export const isNullOrEmpty = (value: any) => {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    value === 'null'
  );
};

export const removeNullFields = (obj: any) => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key] === null) {
      delete obj[key];
    }
  }

  return obj;
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

export const getBrowserLanguage = (): ILanguage => {
  const browserLanguages = navigator.languages || [
    navigator.language,
  ];

  // Extract only language codes (e.g., "en-US" -> "en")
  const availableCodes = languages.map((lang) => lang.code);

  for (const lang of browserLanguages) {
    const code = lang.split('-')[0]; // Extract main language part
    if (availableCodes.includes(code)) {
      return languages.find((l) => l.code === code)!;
    }
  }

  // Default to English if no match is found
  return languages.find((l) => l.code === 'en')!;
};

export const getButtonStyles = (room: IRoom) => {
  const variant = room.button?.variant || 'contained';

  return {
    '.MuiBox-root': {
      backgroundColor: 'transparent !important',
    },
    '& .MuiButton-startIcon': {
      position: 'absolute',
      left: '15px',
      marginRight: 0,
    },
    '& .MuiButton-endIcon': {
      position: 'absolute',
      right: '15px',
      marginLeft: 0,
    },
    height: '55px',
    borderRadius: room.button?.borderRadius || '30px',
    color: room.button?.color || 'white',
    backgroundColor:
      variant === 'contained'
        ? `${room.button?.backgroundColor} !important`
        : 'transparent !important',
    borderColor: room.button?.backgroundColor || '',
    '&:hover': {
      backgroundColor:
        variant === 'contained'
          ? `${room.button?.backgroundColor} !important`
          : 'transparent !important',
      borderColor: room.button?.backgroundColor || '',
    },
    fontFamily: room.font?.family,
  };
};
