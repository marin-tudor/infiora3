import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as linkService from './link.service';
import { pick, match } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';
import { Activity } from '../activity';
import Room from '../room/room.model';

export const getLinks = catchAsync(async (req: Request, res: Response) => {
  const { room, group } = pick(req.query, ['room', 'group']);
  const filter = {
    $or: [room && { room }, group && { group }].filter(Boolean),
    ...match(req.query, ['title']),
  };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await linkService.queryLinks(filter, options);
  res.send(result);
});

export const getLink = catchAsync(async (req: Request, res: Response) => {
  const linkId = toObjectId(req.params['linkId']);
  const link = req.user ? await linkService.getLinkById(linkId) : await linkService.getPublicLinkById(linkId);
  if (!link) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Link not found');
  }
  const { room: roomId, item: itemId, language, device } = pick(req.query, ['room', 'item', 'language', 'device']);
  if (roomId) {
    const room = await Room.findById(roomId).populate('hotel');
    if (room) {
      const item = link.items?.find((i) => String(i.id) === String(itemId));
      await Activity.create({
        user: room.hotel.user,
        hotel: room.hotel.id,
        action: 'tap',
        details: {
          image: room.hotel.image,
          title: room.hotel.name,
          headline: `Room ${room.number || ''}'s ${item?.title || link.title} was tapped`,
          room: room.id,
          link: link.id,
          item: item?.id,
          language,
          device,
        },
      });
    }
  }
  res.send(link);
});

export const createLink = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const link = await linkService.createLink(req.body, files);
  res.status(httpStatus.CREATED).send(link);
});

export const updateLink = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const linkId = toObjectId(req.params['linkId']);
  const link = await linkService.updateLinkById(linkId, req.body, files);
  res.send(link);
});

export const deleteLink = catchAsync(async (req: Request, res: Response) => {
  const linkId = toObjectId(req.params['linkId']);
  await linkService.deleteLinkById(linkId);
  res.status(httpStatus.NO_CONTENT).send();
});

export const reorderLinks = catchAsync(async (req: Request, res: Response) => {
  const id = toObjectId(req.params['id']);
  await linkService.reorderLinks(id, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});
