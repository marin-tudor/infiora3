import { Model, Document, ObjectId } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export interface ISurveyAnswer {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: any; // string | string[] | number | boolean | Record<string, number>
}

export interface IFeedback {
  hotel: ObjectId;
  room: ObjectId;
  rating: number;
  email: string;
  message: string;
  surveyAnswers?: ISurveyAnswer[];
}

export interface IFeedbackDoc extends IFeedback, Document {}

export interface IFeedbackModel extends Model<IFeedbackDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewCreatedFeedback = IFeedback;

export const feedbackPopulate = [
  {
    path: 'room',
  },
];
