import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// get popular courses
export const getPopularCourses = async (req: Request, res: Response) => {
  try {
    //Extract query params for limit (default to 10)
    const limit = parseInt(req.query.limit as string) || 10;

    // Query database
    // We order by studentsCount first, then rating as a tie-breaker
    const popularCourses = await prisma.course.findMany({
      take: limit,
      orderBy: [{ studentsCount: "desc" }, { rating: "desc" }],
      include: {
        instructor: {
          select: {
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: { lessons: true },
        },
      },
    });

    // Send response
    return res.status(200).json({
      success: true,
      data: popularCourses,
    });
  } catch (error) {
    console.error("Error fetching popular courses:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// get course by id
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: {
        id: id,
      },
      include: {
        // Include instructor details (excluding sensitive data like password)
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
        lessons: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    // Check if course exists
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// make new course
export const makeCourse = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      thumbnail,
      category,
      totalDuration,
      level,
      price,
      lessons, // This should be an array of Lesson objects
    } = req.body;

    // Assuming instructorId comes from auth middleware (e.g., req.user.id)
    const instructorId = (req as any).user?.id;

    if (!instructorId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Instructor ID missing" });
    }

    // Use Prisma's nested create to handle Course and Lessons at once
    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        thumbnail,
        category,
        totalDuration,
        level,
        price: parseFloat(price),
        instructorId,
        // Nested creation of lessons
        lessons: {
          create: lessons.map((lesson: any) => ({
            title: lesson.title,
            duration: lesson.duration,
            videoUrl: lesson.videoUrl,
            content: lesson.content,
            isCompleted: false,
          })),
        },
      },
      include: {
        lessons: true, // Return the lessons in the response
      },
    });

    return res.status(201).json({
      success: true,
      message: "Course uploaded successfully",
      data: newCourse,
    });
  } catch (error) {
    console.error("Error uploading course:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload course",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
