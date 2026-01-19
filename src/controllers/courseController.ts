import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";

// get popular courses
export const getPopularCourses = async (req: Request, res: Response) => {
  try {
    //Extract query params for limit (default to 10)
    const limit = parseInt(req.query.limit as string) || 8;

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
// get courses
export const getCourses = async (req: Request, res: Response) => {
  try {
    //Extract query params for limit (default to 10)
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    // Query database
    const courses = await prisma.course.findMany({
      take: limit,
      orderBy: [{ studentsCount: "desc" }, { rating: "desc" }],
      skip: skip,
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
      data: courses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
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
    if (!id || id != undefined) {
      throw new AppError("Tutor id not found", 404);
    }

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

//get tutor his courses
export const getTutorCourses = async (req: Request, res: Response) => {
  try {
    const instructorId = (req as any).user?.id;

    if (!instructorId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Tutor ID not found" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const [courses, totalCount] = await prisma.$transaction([
      prisma.course.findMany({
        where: { instructorId: instructorId },
        orderBy: { createdAt: "desc" },
        skip: skip,
        take: limit,
      }),
      prisma.course.count({
        where: { instructorId: instructorId },
      }),
    ]);

    const hasNextPage = totalCount > page * limit;

    return res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        totalItems: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage,
      },
    });
  } catch (error) {
    console.error("Error fetching tutor courses:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error: Could not retrieve courses",
    });
  }
};
// make new course
// export const makeCourse = async (req: Request, res: Response) => {
//   try {
//     const {
//       title,
//       description,
//       thumbnail,
//       category,
//       totalDuration,
//       level,
//       price,
//     } = req.body;

//     const instructorId = (req as any).user?.id;

//     if (!instructorId) {
//       return res
//         .status(401)
//         .json({ message: "Unauthorized: Instructor ID missing" });
//     }

//     // Use Prisma's nested create to handle Course and Lessons at once
//     const newCourse = await prisma.course.create({
//       data: {
//         title,
//         description,
//         thumbnail,
//         category,
//         totalDuration,
//         level,
//         price: parseFloat(price),
//         instructorId,
//         // Nested creation of lessons
//         lessons: {
//           create: lessons.map((lesson: any) => ({
//             title: lesson.title,
//             duration: lesson.duration,
//             videoUrl: lesson.videoUrl,
//             content: lesson.content,
//             isCompleted: false,
//           })),
//         },
//       },
//       include: {
//         lessons: true, // Return the lessons in the response
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Course uploaded successfully",
//       data: newCourse,
//     });
//   } catch (error) {
//     console.error("Error uploading course:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to upload course",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
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
    } = req.body;
    const instructorId = (req as any).user.id;

    if (!title || !price || !instructorId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

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
      },
    });

    res.status(201).json({
      success: true,
      data: newCourse,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// add lession
export const addLesson = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, duration, videoUrl, content } = req.body;
    const userId = req.user.id;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
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
        courseId: courseId,
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
    const { id } = req.params;
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
