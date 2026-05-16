const allRoles = {
  user: [],
  admin: [
    'getUsers',
    'manageUsers',
    'getTickets',
    'manageTickets',
    'getBatches',
    'manageBatches',
    'getTags',
    'manageTags',
    'getHotels',
    'manageHotels',
  ],
  manager: ['getUsers', 'getHotels'],
};

export const roles: string[] = Object.keys(allRoles);
export const roleRights: Map<string, string[]> = new Map(Object.entries(allRoles));
