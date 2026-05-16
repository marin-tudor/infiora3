import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { ILinkDoc, ILinkModel } from './link.interfaces';
import { HOTEL_MAP_MARKER_ICONS } from '../hotel/hotel.interfaces';

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  value: String,
  type: { type: String, default: 'link' },
  data: Object,
});
itemSchema.plugin(toJSON);

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  url: String,
  urlButtonText: String,
  links: [{ url: String, urlButtonText: String }],
  phone: String,
  address: String,
  images: [String],
  video: String,
  items: Object,
  mapEnabled: { type: Boolean, default: false },
  mapTitle: String,
  mapDescription: String,
  mapImage: String,
  mapLat: { type: Number, min: -90, max: 90 },
  mapLng: { type: Number, min: -180, max: 180 },
  mapColor: String,
  mapIcon: { type: String, enum: HOTEL_MAP_MARKER_ICONS },
  linkedMapPointId: String,
});
sectionSchema.plugin(toJSON);

const linkSchema = new mongoose.Schema<ILinkDoc, ILinkModel>(
  {
    position: { type: Number, default: 0 },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
    },
    title: { type: String, required: true },
    value: String,
    type: { type: String, default: 'link' },
    image: String,
    imageType: {
      type: String,
      enum: ['none', 'icon', 'image', 'url'],
      default: 'none',
    },
    items: [itemSchema],
    sections: [sectionSchema],
    data: Object,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

linkSchema.index({ room: 1, isActive: 1, position: 1 });
linkSchema.index({ group: 1, isActive: 1, position: 1 });

// add plugin that converts mongoose to json
linkSchema.plugin(toJSON);
linkSchema.plugin(paginate);

const Link = mongoose.model<ILinkDoc, ILinkModel>('Link', linkSchema);

export default Link;
