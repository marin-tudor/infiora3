export const buildURLQuery = (
  obj: Record<string, string | number | boolean>
) => {
  const o: Record<string, string | number | boolean> =
    Object.fromEntries(
      Object.entries(obj).filter(([key, value]) => value !== '')
    );
  return Object.entries(o)
    .map(([key, value]) =>
      [encodeURIComponent(key), encodeURIComponent(value)].join('=')
    )
    .join('&');
};
