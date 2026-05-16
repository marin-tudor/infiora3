import mongoose from 'mongoose';
import config from '../../config/config';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ITagDoc, ITagModel } from './tag.interfaces';

const tagSchema = new mongoose.Schema<ITagDoc, ITagModel>(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Batch',
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
    },
    name: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    type: String,
  },
  {
    toJSON: { virtuals: true },
    timestamps: true,
  }
);

tagSchema.virtual('url').get(function () {
  return `${config.urls.app}/${this.id}`;
});

// add plugin that converts mongoose to json
tagSchema.plugin(toJSON);
tagSchema.plugin(paginate);

const Tag = mongoose.model<ITagDoc, ITagModel>('Tag', tagSchema);

export default Tag;
