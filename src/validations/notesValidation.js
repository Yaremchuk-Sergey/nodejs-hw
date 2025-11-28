import { Joi } from 'celebrate';
import mongoose from 'mongoose';
import { TAGS } from '../constants/tags.js';

const { isValidObjectId } = mongoose;

const objectIdValidator = (value, helpers) => {
  if (!isValidObjectId(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

export const getAllNotesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(5).max(20).default(10),
  tag: Joi.string()
    .valid(...TAGS)
    .optional(),
  search: Joi.string().allow('').optional(),
});

export const noteIdSchema = Joi.object({
  noteId: Joi.string()
    .custom(objectIdValidator, 'ObjectId validation')
    .required(),
});

export const createNoteSchema = Joi.object({
  title: Joi.string().min(1).required(),
  content: Joi.string().allow('').optional(),
  tag: Joi.string()
    .valid(...TAGS)
    .default('Todo'),
});

export const updateNoteSchema = {
  params: Joi.object({
    noteId: Joi.string()
      .custom(objectIdValidator, 'ObjectId validation')
      .required(),
  }),
  body: Joi.object({
    title: Joi.string().min(1).optional(),
    content: Joi.string().allow('').optional(),
    tag: Joi.string()
      .valid(...TAGS)
      .optional(),
  }).or('title', 'content', 'tag'),
};
