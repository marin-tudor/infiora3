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
