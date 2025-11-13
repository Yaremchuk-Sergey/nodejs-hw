import { HttpError } from 'http-errors';

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const isProd = process.env.NODE_ENV === 'production';

  // Якщо помилка створена через createHttpError — беремо її статус і повідомлення
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message,
    });
  }

  // Якщо це не HttpError — стандартна обробка
  res.status(500).json({
    message: isProd ? 'Повідомлення про помилку' : err.message,
  });
};
