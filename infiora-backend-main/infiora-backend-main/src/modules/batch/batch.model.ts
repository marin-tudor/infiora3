import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IBatchDoc, IBatchModel } from './batch.interfaces';
import Tag from '../tag/tag.model';

const batchSchema = new mongoose.Schema<IBatchDoc, IBatchModel>(
  {
    name: String,
    description: String,
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
batchSchema.plugin(toJSON);
batchSchema.plugin(paginate);

batchSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const batch = this;

  const tags = await Tag.find({ batch: batch._id });
  await Promise.all(tags.map((t) => t.deleteOne()));
});

const Batch = mongoose.model<IBatchDoc, IBatchModel>('Batch', batchSchema);

export default Batch;
