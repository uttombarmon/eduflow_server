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
    // console.log(courses);
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
export const getCourseWithDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("curse Id: ", id);
    if (!id || id === undefined) {
      throw new AppError("Tutor id not found", 404);
    }

    const course = await prisma.course.findUnique({
      where: {
        id: id as string,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
        lessons: {
          select: {
            title: true,
          },
          orderBy: {
            order: "asc",
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

    return res.status(200).json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log("curse Id: ", id);
    if (!id || id === undefined) {
      throw new AppError("Tutor id not found", 404);
    }

    const course = await prisma.course.findUnique({
      where: {
        id: id as string,
      },
    });

    // Check if course exists
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json(course);
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
        .json({ success: false, message: "Unauthorized: Tutor ID not found" });
    }

    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      instructorId: instructorId,
    };
    if (search) {
      whereClause.title = { contains: search as string, mode: "insensitive" };
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const [courses, totalCount] = await prisma.$transaction([
      prisma.course.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { lessons: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: skip,
        take: limit,
      }),
      prisma.course.count({
        where: whereClause,
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
export const makeCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, thumbnail, category, level, price, status } =
      req.body;
    const instructorId = (req as any).user.id;

    if (!title || price == undefined || price == null || !instructorId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        thumbnail,
        category,
        totalDuration: "",
        level,
        price: parseFloat(price),
        instructorId,
        status,
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

// delete course
export const deleteCourse = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const instructorId = (req as any).user.id;
  if (!courseId) {
    throw new AppError("The course id not found", 404);
  }

  try {
    // Find the course and check ownership
    const course = await prisma.course.findFirst({
      where: { id: courseId as string },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructorId !== instructorId) {
      return res.status(403).json({ message: "Unauthorized: Access denied" });
    }

    // Perform the deletion
    await prisma.course.delete({
      where: { id: courseId as string },
    });

    // Return success
    return res.status(200).json({
      success: true,
      message: "Course and associated lessons deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
