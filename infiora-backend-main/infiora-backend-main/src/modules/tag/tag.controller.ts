import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as tagService from './tag.service';
import { pick, match } from '../utils';
import { IOptions } from '../paginate/paginate';
import { toObjectId } from '../utils/mongoUtils';

export const getTags = catchAsync(async (req: Request, res: Response) => {
  const filter = { ...pick(req.query, ['batch', 'user']), ...match(req.query, ['name']) };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await tagService.queryTags(filter, options);
  res.send(result);
});

export const getTag = catchAsync(async (req: Request, res: Response) => {
  const tagId = toObjectId(req.params['tagId']);
  const tag = await tagService.getTagById(tagId);
  if (!tag) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tag not found');
  }
  res.send(tag);
});

export const createTag = catchAsync(async (req: Request, res: Response) => {
  const tag = await tagService.createTag(req.body);
  res.status(httpStatus.CREATED).send(tag);
});

export const updateTag = catchAsync(async (req: Request, res: Response) => {
  const tagId = toObjectId(req.params['tagId']);
  const tag = await tagService.updateTagById(tagId, req.body);
  res.send(tag);
});

export const deleteTag = catchAsync(async (req: Request, res: Response) => {
  const tagId = toObjectId(req.params['tagId']);
  await tagService.deleteTagById(tagId);
  res.status(httpStatus.NO_CONTENT).send();
});

export const linkTag = catchAsync(async (req: Request, res: Response) => {
  const tagId = toObjectId(req.params['tagId']);
  const tag = await tagService.linkTagById(tagId, req.body);
  res.send(tag);
});

export const unlinkTag = catchAsync(async (req: Request, res: Response) => {
  const tagId = toObjectId(req.params['tagId']);
  const tag = await tagService.unlinkTagById(tagId);
  res.send(tag);
});

export const exportTags = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['batch', 'user']);
  const tags = await tagService.exportTags(filter);
  res.set('Content-Type', `text/csv; name="tags.csv"`);
  res.set('Content-Disposition', `inline; filename="tags.csv"`);
  res.send(tags);
});
