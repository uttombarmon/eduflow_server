import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";

const signToken = (id: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");

  const signOptions: any = {};
  if (process.env.JWT_EXPIRES_IN) {
    signOptions.expiresIn = parseInt(process.env.JWT_EXPIRES_IN);
  }

  return jwt.sign({ id }, secret, signOptions);
};

export const signup = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  const token = signToken(newUser.id);

  res.status(201).json({ status: "success", token, data: { user: newUser } });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new AppError("Please provide email and password", 400);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  const token = signToken(user.id);
  res.status(200).json({ status: "success", token });
};
