import prisma from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { Response } from "express";

// add lession
export const addLesson = async (req: any, res: Response) => {
  try {
    const { c_id: id } = req.params;
    console.log("course id: ", id);
    const { title, duration, videoUrl, content } = req.body;
    const userId = req.user.id;
    if (!userId || userId == undefined) {
      throw new Error("Unauthorized!");
    }
    if (!id || id == undefined) {
      throw new Error("Not found courseId!");
    }

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new AppError("Course not found", 404);
    }

    if (course.instructorId !== userId && req.user.role !== "admin") {
      throw new AppError(
        "You are not authorized to add lessons to this course",
        403,
      );
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        duration,
        videoUrl,
        content,
        courseId: id,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Lesson added successfully",
      data: lesson,
    });
  } catch (error: any) {
    console.error("Add Lesson Error:", error);
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to add lesson", 500);
  }
};

//update lesson
export const updateLesson = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, duration, videoUrl, content, isCompleted } = req.body;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: {
          select: { instructorId: true },
        },
      },
    });

    if (!lesson) {
      throw new AppError("Lesson not found", 404);
    }

    const isInstructor = lesson.course.instructorId === userId;
    const isAdmin = req.user.role === "admin";

    if (!isInstructor && !isAdmin) {
      throw new AppError("You are not authorized to edit this lesson", 403);
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: {
        title,
        duration,
        videoUrl,
        content,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Lesson updated successfully",
      data: updatedLesson,
    });
  } catch (error: any) {
    console.error("Update Lesson Error:", error);
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to update lesson", 500);
  }
};

//remove lesson
export const removeLesson = async (req: any, res: Response) => {
  try {
    const { l_id: id } = req.params;
    const userId = req.user.id;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        course: {
          select: { instructorId: true },
        },
      },
    });

    if (!lesson) {
      throw new AppError("Lesson not found", 404);
    }

    const isInstructor = lesson.course.instructorId === userId;
    const isAdmin = req.user.role === "admin";

    if (!isInstructor && !isAdmin) {
      throw new AppError(
        "You do not have permission to delete this lesson",
        403,
      );
    }

    await prisma.lesson.delete({
      where: { id },
    });

    res.status(204).json({
      status: "success",
      message: "Lesson removed successfully",
      data: null,
    });
  } catch (error: any) {
    console.error("Remove Lesson Error:", error);
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to remove lesson", 500);
  }
};
