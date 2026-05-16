import { extractWebhookFees } from '../stripe-webhook.handler';

describe('extractWebhookFees', () => {
  it('extracts application fee and Stripe fee from charge object', () => {
    const mockCharge = {
      amount: 10000,
      application_fee_amount: 250,
      balance_transaction: {
        fee: 165,
        net: 9585,
      },
    };

    const result = extractWebhookFees(mockCharge as any);

    expect(result.platformFeeAmount).toBe(250);
    expect(result.stripeFeeAmount).toBe(165);
    expect(result.netAmountToHotel).toBe(9585);
  });

  it('handles missing balance_transaction gracefully', () => {
    const mockCharge = { amount: 5000, application_fee_amount: 125 };

    const result = extractWebhookFees(mockCharge as any);

    expect(result.platformFeeAmount).toBe(125);
    expect(result.stripeFeeAmount).toBeNull();
    expect(result.netAmountToHotel).toBeNull();
  });
});
