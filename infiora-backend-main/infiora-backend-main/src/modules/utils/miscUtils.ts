export const removeNullFields = (obj: any): any => {
  if (Array.isArray(obj)) {
    // If obj is an array, process its elements
    return obj
      .map((item) => (typeof item === 'object' && item !== null ? removeNullFields(item) : item))
      .filter((item) => item !== null && item !== undefined && item !== '');
  }
  if (typeof obj === 'object' && obj !== null) {
    // If obj is a plain object, process its keys
    const result: Record<string, any> = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        // Recurse for nested objects or arrays
        const cleanedValue = removeNullFields(value);

        if (
          (Array.isArray(cleanedValue) && cleanedValue.length > 0) ||
          (typeof cleanedValue === 'object' && Object.keys(cleanedValue).length > 0) ||
          (!Array.isArray(cleanedValue) && typeof cleanedValue !== 'object')
        ) {
          result[key] = cleanedValue;
        }
      } else if (value !== null && value !== undefined && value !== '') {
        // Add non-null, non-empty values to the result
        result[key] = value;
      }
    });

    return result;
  }
  // If obj is neither an array nor an object, return it unchanged
  return obj;
};

export const toPopulateString = (populate1: any): string => {
  const paths: string[] = [];

  function traverse(populate: any, basePath: string = '') {
    if (Array.isArray(populate)) {
      populate.forEach((item) => traverse(item, basePath));
    } else if (typeof populate === 'object' && populate.path) {
      const currentPath = basePath ? `${basePath}.${populate.path}` : populate.path;
      if (populate.populate) {
        traverse(populate.populate, currentPath);
      } else {
        paths.push(currentPath);
      }
    }
  }

  traverse(populate1);
  return paths.join(',');
};

export const toDate = ({ startDate, endDate }: { startDate?: string; endDate?: string }) => {
  // Calculate default start date as three months ago
  const defaultStart = new Date();
  defaultStart.setMonth(defaultStart.getMonth() - 3);
  defaultStart.setHours(0, 0, 0, 0); // Start of the day

  // Parse and validate the start date or use default
  const start = startDate && !Number.isNaN(Date.parse(startDate)) ? new Date(startDate) : defaultStart;

  // Calculate default end date as the next day
  const defaultEnd = new Date();
  defaultEnd.setDate(defaultEnd.getDate() + 1); // Next day
  defaultEnd.setHours(23, 59, 59, 999); // End of the day

  // Parse and validate the end date or use default
  const end = endDate && !Number.isNaN(Date.parse(endDate)) ? new Date(endDate) : defaultEnd;

  return { start, end };
};
