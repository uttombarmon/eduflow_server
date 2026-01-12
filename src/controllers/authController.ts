import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { User } from "../types/TypesAll.js";

const signToken = (id: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");

  const signOptions: any = {};
  if (process.env.JWT_EXPIRES_IN) {
    signOptions.expiresIn = parseInt(process.env.JWT_EXPIRES_IN);
  }

  const accessToken = jwt.sign({ id }, secret, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id }, secret, { expiresIn: "1d" });
  return { accessToken, refreshToken };
};

export const signup = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  const { accessToken, refreshToken } = signToken(newUser.id);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "strict",
    maxAge: 1 * 24 * 60 * 60 * 1000, //1 day
  });
  res.status(201).json({
    status: "success",
    accessToken,
    data: {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
      },
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("email: ", email, "password: ", password);

  if (!email || !password)
    throw new AppError("Please provide email and password", 400);

  const user: User = await prisma.user.findUnique({ where: { email } });

  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password as string))
  ) {
    throw new AppError("Incorrect email or password", 401);
  }

  const { accessToken, refreshToken } = signToken(user.id);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "strict",
    maxAge: 1 * 24 * 60 * 60 * 1000, //1 day
  });
  return res.status(200).json({
    status: "success",
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
};
