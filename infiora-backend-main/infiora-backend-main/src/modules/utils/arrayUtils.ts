export const replaceItem = (items: any, from: number, to: number) => {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) {
    // Invalid from or to index, return the original list unchanged
    return items;
  }

  const updatedList = [...items]; // Create a copy of the original list

  // Remove the item at the 'from' index and store it in a variable
  const [removedItem] = updatedList.splice(from, 1);

  // Insert the removed item at the 'to' index
  updatedList.splice(to, 0, removedItem);

  return updatedList;
};

export const sortByPosition = <T extends { position?: number }>(items?: T[]): T[] => {
  const arr = items ?? [];

  return arr.sort((a, b) => {
    const posA = a.position !== undefined ? a.position : Infinity; // Treat undefined as the largest number
    const posB = b.position !== undefined ? b.position : Infinity; // Treat undefined as the largest number

    return posA - posB;
  });
};

export const reorderItems = <T extends { position?: number; group?: string }>(items?: T[]): T[] => {
  const arr = items ?? [];
  const arr1 = arr.filter((a) => a.group);
  const arr2 = arr.filter((a) => !a.group);

  return [...sortByPosition(arr1), ...sortByPosition(arr2)];
};
