export const isNullOrEmpty = (value: any) => {
  return value === null || value === undefined || value === '';
};

// Check if a value is an array
export const isArray = (value: any) => {
  return Array.isArray(value);
};

// Check if a value is an object (excluding null and arrays)
export const isObject = (value: any) => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
};

// Check if a value is a function
export const isFunction = (value: any) => {
  return typeof value === 'function';
};

// Check if a value is a string
export const isString = (value: any) => {
  return typeof value === 'string';
};

// Check if a value is a number
export const isNumber = (value: any) => {
  return typeof value === 'number' && isFinite(value);
};
