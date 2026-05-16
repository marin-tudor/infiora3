jest.mock('./maintenance.model', () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

import MaintenanceIssue from './maintenance.model';
import { updateMaintenanceStatus } from './maintenance.service';

describe('maintenance.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updateMaintenanceStatus enables mongoose validators', async () => {
    await updateMaintenanceStatus('issue-1', 'done');

    expect(MaintenanceIssue.findByIdAndUpdate).toHaveBeenCalledWith(
      'issue-1',
      { status: 'done' },
      { new: true, runValidators: true }
    );
  });
});
