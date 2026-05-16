import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IGroupDoc, IGroupModel } from './group.interfaces';
import { Link } from '../link';

const groupSchema = new mongoose.Schema<IGroupDoc, IGroupModel>(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Hotel',
    },
    title: {
      type: String,
      default: 'Group',
    },
    description: {
      type: String,
    },
    background: {
      color: { type: String },
      direction: { type: String },
      type: { type: String },
      image: { type: String },
      imageOpacity: { type: Number, default: 1 },
      backgroundFit: { type: String, default: 'cover' },
      backgroundPosition: { type: String, default: 'center center' },
      tileSize: { type: Number, default: 120 },
    },
    font: {
      color: { type: String },
      family: { type: String },
    },
    button: {
      color: { type: String },
      backgroundColor: { type: String },
      variant: { type: String },
      borderRadius: { type: String },
    },
    popup: {
      message: { type: String },
      buttonText: { type: String },
      link: { type: String },
      backgroundColor: { type: String },
      fontColor: { type: String },
      size: { type: String },
      position: { type: String },
      image: { type: String },
      imageType: { type: String, enum: ['none', 'image', 'icon', 'url'] },
      isActive: { type: Boolean },
    },
    newsletter: {
      message: { type: String },
      successMessage: { type: String },
      buttonText: { type: String },
      mainButtonText: { type: String },
      type: { type: String },
      color: { type: String },
      image: { type: String },
      imageType: { type: String, enum: ['none', 'image', 'icon', 'url'] },
      isActive: { type: Boolean },
    },
    feedback: {
      isActive: { type: Boolean },
      emailRequirement: { type: String, enum: ['none', 'optional', 'mandatory'] },
      textRequirement: { type: String, enum: ['none', 'optional', 'mandatory'] },
      emails: [{ type: String }],
      googleMapsLink: { type: String },
    },
    survey: {
      isActive: { type: Boolean },
      type: { type: String, enum: ['popup', 'button'] },
      buttonText: { type: String },
      mainButtonText: { type: String },
      imageType: { type: String, enum: ['none', 'image', 'icon', 'url'] },
      image: { type: String },
      questions: [
        {
          id: { type: String },
          type: {
            type: String,
            enum: ['rating', 'yes_no', 'single_choice', 'multi_choice', 'open_text', 'nps', 'matrix', 'contact'],
          },
          text: { type: String },
          options: [{ type: String }],
          matrixRows: [{ type: String }],
          matrixColumns: [{ type: String }],
          required: { type: Boolean },
        },
      ],
    },
    housekeeping: {
      isActive: { type: Boolean, default: false },
      mainButtonText: { type: String },
      icon: { type: String },
      emails: [{ type: String }],
      askRoomNumber: { type: Boolean, default: false },
      roomNumberLabel: { type: String },
      askReservationCode: { type: Boolean, default: false },
      reservationCodeLabel: { type: String },
      options: [{ key: { type: String }, label: { type: String }, icon: { type: String } }],
    },
    maintenance: {
      isActive: { type: Boolean, default: false },
      mainButtonText: { type: String },
      icon: { type: String },
      emails: [{ type: String }],
      askRoomNumber: { type: Boolean, default: false },
      roomNumberLabel: { type: String },
      askReservationCode: { type: Boolean, default: false },
      reservationCodeLabel: { type: String },
      options: [{ key: { type: String }, label: { type: String } }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins to the schema
groupSchema.plugin(toJSON);
groupSchema.plugin(paginate);

groupSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const group = this;
  const links = await Link.find({ group: group._id });
  await Promise.all(links.map((l) => l.deleteOne()));
});

// Create the model
const Group = mongoose.model<IGroupDoc, IGroupModel>('Group', groupSchema);

export default Group;
