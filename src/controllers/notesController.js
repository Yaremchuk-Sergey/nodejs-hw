import Note from '../models/note.js';
import createHttpError from 'http-errors';
import { TAGS } from '../constants/tags.js';

export const getAllNotes = async (req, res, next) => {
  try {
    const { tag, search } = req.query;

    let page = Number(req.query.page) || 1;
    let perPage = Number(req.query.perPage) || 10;

    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(perPage) || perPage < 1) perPage = 10;

    const MAX_PER_PAGE = 100;
    if (perPage > MAX_PER_PAGE) perPage = MAX_PER_PAGE;

    const filter = {};

    if (tag) {
      if (!TAGS.includes(tag)) {
        throw createHttpError(
          400,
          `Invalid tag. Allowed tags: ${TAGS.join(', ')}`,
        );
      }
      filter.tag = tag;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (page - 1) * perPage;

    let findQuery = Note.find(filter);

    if (search) {
      findQuery = findQuery
        .select({
          score: { $meta: 'textScore' },
          title: 1,
          content: 1,
          tag: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      findQuery = findQuery
        .select({ title: 1, content: 1, tag: 1, createdAt: 1, updatedAt: 1 })
        .sort({ createdAt: -1 });
    }

    const pagedQuery = findQuery.skip(skip).limit(perPage);

    const [totalNotes, notes] = await Promise.all([
      Note.countDocuments(filter),
      pagedQuery.exec(),
    ]);

    const totalPages = totalNotes === 0 ? 0 : Math.ceil(totalNotes / perPage);

    return res.status(200).json({
      page,
      perPage,
      totalNotes,
      totalPages,
      notes,
    });
  } catch (error) {
    next(error);
  }
};

export const getNoteById = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findById(noteId);
    if (!note) throw createHttpError(404, 'Note not found');
    res.status(200).json(note);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { title, content = '', tag = 'Todo' } = req.body;

    if (!title) throw createHttpError(400, 'Title is required');

    if (tag && !TAGS.includes(tag)) {
      throw createHttpError(
        400,
        `Invalid tag. Allowed tags: ${TAGS.join(', ')}`,
      );
    }

    const newNote = await Note.create({ title, content, tag });
    res.status(201).json(newNote);
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const deletedNote = await Note.findByIdAndDelete(noteId);
    if (!deletedNote) throw createHttpError(404, 'Note not found');
    res.status(200).json(deletedNote);
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const update = req.body;

    if (update.tag && !TAGS.includes(update.tag)) {
      throw createHttpError(
        400,
        `Invalid tag. Allowed tags: ${TAGS.join(', ')}`,
      );
    }

    const updatedNote = await Note.findByIdAndUpdate(noteId, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedNote) throw createHttpError(404, 'Note not found');
    res.status(200).json(updatedNote);
  } catch (error) {
    next(error);
  }
};
