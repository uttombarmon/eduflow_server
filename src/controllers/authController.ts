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
  console.log("signup route called");
  const { email, password, name, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: { email, password: hashedPassword, name, role },
  });
  if (!newUser || newUser == null) {
    throw new AppError("Signup unsuccessful!", 401);
  }
  const user = newUser as User;
  const { accessToken, refreshToken } = signToken(user.id);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "none",
    maxAge: 1 * 24 * 60 * 60 * 1000, //1 day
  });
  res.status(201).json({
    status: "success",
    accessToken,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    },
  });
};

export const login = async (req: Request, res: Response) => {
  console.log("login route called");
  const { email, password } = req.body;
  console.log("email: ", email, "password: ", password);

  if (!email || !password)
    throw new AppError("Please provide email and password", 400);

  const user = await prisma.user.findUnique({ where: { email } });

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
    sameSite: "none",
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
export const logout = (req: Request, res: Response) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

export const onStartUser = async (req: Request, res: Response) => {
  console.log("auth me route called");
  const email = (req as any).user?.email;
  if (!email) {
    throw new AppError("Unathorized", 402);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (user != null && (user as User)) {
    return res.status(200).json({
      status: "success",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  }
  return res.status(401).json({
    status: "Not Found User",
    user: null,
  });
};
