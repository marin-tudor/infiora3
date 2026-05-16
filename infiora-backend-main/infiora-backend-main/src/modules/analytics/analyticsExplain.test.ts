import { hasIndexedWinningPlan, verifyIndexedWinningPlan } from './analyticsExplain';

describe('analyticsExplain', () => {
  test('detects indexed winning plan from query planner', () => {
    expect(
      hasIndexedWinningPlan({
        queryPlanner: {
          winningPlan: {
            stage: 'FETCH',
            inputStage: {
              stage: 'IXSCAN',
            },
          },
        },
      }),
    ).toBe(true);
  });

  test('detects indexed winning plan from aggregate cursor explain', () => {
    expect(
      hasIndexedWinningPlan({
        stages: [
          {
            $cursor: {
              queryPlanner: {
                winningPlan: {
                  stage: 'PROJECTION_SIMPLE',
                  inputStage: {
                    stage: 'COUNT_SCAN',
                  },
                },
              },
            },
          },
        ],
      }),
    ).toBe(true);
  });

  test('throws when no indexed stage exists in winning plan', () => {
    expect(() =>
      verifyIndexedWinningPlan('guest-orders', {
        queryPlanner: {
          winningPlan: {
            stage: 'COLLSCAN',
          },
        },
      }),
    ).toThrow('Analytics explain check failed for guest-orders');
  });
});
