import mongoose, { ClientSession } from 'mongoose';

const transactionUnsupportedPatterns = [
  'Transaction numbers are only allowed on a replica set member or mongos',
  'transactions are not supported',
  'does not support retryable writes',
  'replica set',
];

const isTransactionUnsupportedError = (error: any): boolean => {
  const message = String(error?.message || '');
  return (
    error?.code === 20 ||
    error?.codeName === 'IllegalOperation' ||
    transactionUnsupportedPatterns.some((pattern) => message.includes(pattern))
  );
};

export const withOptionalTransaction = async <T>(work: (session: ClientSession | null) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction().catch(() => undefined);
    }

    if (isTransactionUnsupportedError(error)) {
      return work(null);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};
