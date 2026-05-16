import Feedback from './feedback.model';
import { NewCreatedFeedback, IFeedbackDoc, feedbackPopulate } from './feedback.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import { toPopulateString } from '../utils/miscUtils';

/**
 * Query for feedbacks
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryFeedbacks = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const feedbacks = await Feedback.paginate(filter, { ...options, populate: toPopulateString(feedbackPopulate) });
  return feedbacks;
};

/**
 * Create a feedback
 * @param {NewCreatedFeedback} feedbackBody
 * @returns {Promise<IFeedbackDoc>}
 */
export const createFeedback = async (feedbackBody: NewCreatedFeedback): Promise<IFeedbackDoc> => {
  return Feedback.create(feedbackBody);
};
