/**
 * Create a MongoDB $or query for the provided keys using the search term.
 * @param {Object} query - Source object containing the `search` value.
 * @param {string[]} keys - Keys to construct regex match conditions for.
 * @returns {Object} - MongoDB $or query object.
 */
const match = (query: Record<string, any>, keys: string[]): any => {
  if (!query || !query['search']) {
    return {};
  }

  const searchTerm = query['search'];

  return {
    $or: keys.map((key) => {
      if (key === '_id') {
        return {
          $expr: {
            $regexMatch: {
              input: { $toString: '$_id' },
              regex: searchTerm,
              options: 'i',
            },
          },
        };
      }
      return {
        [key]: { $regex: searchTerm, $options: 'i' },
      };
    }),
  };
};

export default match;
