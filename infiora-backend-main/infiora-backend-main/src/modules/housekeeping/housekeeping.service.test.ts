jest.mock('./housekeeping.model', () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

import HousekeepingRequest from './housekeeping.model';
import { updateHousekeepingStatus } from './housekeeping.service';

describe('housekeeping.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updateHousekeepingStatus enables mongoose validators', async () => {
    await updateHousekeepingStatus('request-1', 'done');

    expect(HousekeepingRequest.findByIdAndUpdate).toHaveBeenCalledWith(
      'request-1',
      { status: 'done' },
      { new: true, runValidators: true }
    );
  });
});
