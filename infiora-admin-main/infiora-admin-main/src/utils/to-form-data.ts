export const toFormData = (
  data: Record<string, any>,
  formData = new FormData(),
  parentKey = ''
): FormData => {
  const appendToFormData = (key: string, value: any) => {
    if (value === undefined || value === null) {
      return;
    }

    const getKey = (currentKey: string) =>
      parentKey ? `${parentKey}[${currentKey}]` : currentKey;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const nestedKey = getKey(`${key}[${index}]`);
        if (typeof item === 'object' && item !== null) {
          // If item is an object, stringify it and append
          formData.append(nestedKey, JSON.stringify(item));
        } else {
          // Otherwise, append the array element directly
          formData.append(nestedKey, item as string | Blob);
        }
      });
    } else if (typeof value === 'object') {
      // If value is an object, stringify it and append
      formData.append(getKey(key), JSON.stringify(value));
    } else {
      // If not an array or object, append the value directly
      formData.append(getKey(key), value as string | Blob);
    }
  };

  Object.entries(data).forEach(([key, value]) => {
    appendToFormData(key, value);
  });

  return formData;
};
