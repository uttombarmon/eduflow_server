import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../lib/prisma.js';

export const protect = async (req: any, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) throw new AppError('You are not logged in!', 401);

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

  // Check if user still exists
  const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!currentUser) throw new AppError('The user belonging to this token no longer exists.', 401);

  // Grant access to protected route
  req.user = currentUser;
  next();
};