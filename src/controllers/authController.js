import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';
import { User } from '../models/user.js';
import { createSession, setSessionCookies } from '../services/auth.js';
import { Session } from '../models/session.js';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import dotenv from 'dotenv';
import { sendEmail } from '../utils/sendMail.js';

dotenv.config();

export const registerUser = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createHttpError(400, 'Email in use'));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      ...(username ? { username } : {}),
    });
    const newSession = await createSession(newUser._id);
    setSessionCookies(res, newSession);
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return next(createHttpError(401, 'Invalid credentials'));
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return next(createHttpError(401, 'Invalid credentials'));
    }
    await Session.deleteMany({ userId: user._id });
    const newSession = await createSession(user._id);
    setSessionCookies(res, newSession);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const refreshUserSession = async (req, res, next) => {
  try {
    const { sessionId, refreshToken } = req.cookies ?? {};
    if (!sessionId || !refreshToken) {
      return next(createHttpError(401, 'Session not found'));
    }
    const session = await Session.findOne({ _id: sessionId, refreshToken });
    if (!session) {
      return next(createHttpError(401, 'Session not found'));
    }
    if (session.refreshTokenValidUntil.getTime() < Date.now()) {
      return next(createHttpError(401, 'Session token expired'));
    }
    await Session.deleteOne({ _id: session._id });
    const newSession = await createSession(session.userId);
    setSessionCookies(res, newSession);
    res.status(200).json({ message: 'Session refreshed' });
  } catch (err) {
    next(err);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const { sessionId } = req.cookies;
    if (sessionId) {
      await Session.findByIdAndDelete(sessionId);
    }
    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const requestResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(200)
        .json({ message: 'If this email exists, a reset link has been sent' });
    }
    const resetToken = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );
    const templatePath = path.resolve(
      'src',
      'templates',
      'reset-password-email.html',
    );
    const templateSource = await fs.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    const frontendDomain = (process.env.FRONTEND_DOMAIN || '').replace(
      /\/+$/,
      '',
    );
    const resetLink = `${frontendDomain}/reset-password?token=${encodeURIComponent(
      resetToken,
    )}`;
    const html = template({
      name: user.username || user.email,
      resetLink,
    });
    try {
      await sendEmail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Reset your password',
        html,
      });
    } catch {
      return next(
        createHttpError(
          500,
          'Failed to send the email, please try again later.',
        ),
      );
    }
    return res
      .status(200)
      .json({ message: 'If this email exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(createHttpError(401, 'Invalid or expired token'));
    }
    const { sub, email } = payload ?? {};
    if (!sub || !email) {
      return next(createHttpError(401, 'Invalid or expired token'));
    }
    const user = await User.findOne({ _id: sub, email });
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};
