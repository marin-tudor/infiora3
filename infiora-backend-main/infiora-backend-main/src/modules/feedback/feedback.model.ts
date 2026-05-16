import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IFeedbackDoc, IFeedbackModel } from './feedback.interfaces';

const feedbackSchema = new mongoose.Schema<IFeedbackDoc, IFeedbackModel>(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Hotel',
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Room',
    },
    rating: Number,
    email: String,
    message: String,
    surveyAnswers: [
      {
        questionId: { type: String },
        questionText: { type: String },
        questionType: { type: String },
        answer: { type: mongoose.Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ hotel: 1, createdAt: -1 });
feedbackSchema.index({ hotel: 1, room: 1, createdAt: -1 });

// Add plugins to the schema
feedbackSchema.plugin(toJSON);
feedbackSchema.plugin(paginate);

// Create the model
const Feedback = mongoose.model<IFeedbackDoc, IFeedbackModel>('Feedback', feedbackSchema);

export default Feedback;
