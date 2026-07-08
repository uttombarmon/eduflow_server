import type { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { slugify } from "../utils/SlugHelper.js";

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
        modules: {
          select: {
            _count: {
              select: { lessons: true },
            },
          },
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
        modules: {
          select: {
            _count: {
              select: { lessons: true },
            },
          },
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
    console.log("Fetching Course ID:", id);

    if (!id || id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: id as string,
      },
      include: {
        category: true,
        modules: {
          orderBy: {
            order: "asc",
          },
          include: {
            lessons: {
              orderBy: {
                order: "asc",
              },
            },
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
    // console.log(course);
    return res.status(200).json({
      success: true,
      message: "Course retrieved successfully",
      data: course,
    });
  } catch (error: any) {
    console.error("Error fetching course with curriculum:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
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
      whereClause.title = { contains: search, mode: "insensitive" };
    }

    if (status && status.toLowerCase() !== "all") {
      whereClause.status = status;
    }
    console.log(whereClause);

    const [courses, totalCount] = await prisma.$transaction([
      prisma.course.findMany({
        where: whereClause,
        include: {
          modules: {
            select: {
              _count: {
                select: { lessons: true },
              },
            },
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

    console.log("responses: ", courses);

    const formattedCourses = courses.map((course) => {
      const totalLessons = course.modules.reduce(
        (sum, currentModule) => sum + currentModule._count.lessons,
        0,
      );

      const { modules, ...courseData } = course;

      return {
        ...courseData,
        _count: {
          modules: modules.length, // 🎯 Fixed: Use the array length instead of the broken _count object
          lessons: totalLessons,
        },
      };
    });

    const hasNextPage = totalCount > page * limit;
    console.log(formattedCourses);
    return res.status(200).json({
      success: true,
      data: formattedCourses,
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
    const {
      title,
      description,
      thumbnail,
      category,
      level,
      price,
      status,
      modules,
    } = req.body;
    const instructorId = (req as any).user.id;

    if (
      !title ||
      price === undefined ||
      price === null ||
      !instructorId ||
      !category
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1. Generate slug for the Course
    const courseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // 2. Generate slug for the Category (required by your Category model)
    const categorySlug = category
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // 3. Execute the Prisma write using connectOrCreate
    const newCourse = await prisma.course.create({
      data: {
        title,
        slug: courseSlug,
        description,
        thumbnail,
        level: level?.toUpperCase(),
        price: parseFloat(price),
        status,

        // ✨ MAGIC HAPPENS HERE: Connect or Create the category dynamically
        category: {
          connectOrCreate: {
            where: { name: category }, // Looks for an exact match by unique name
            create: {
              name: category,
              slug: categorySlug,
            },
          },
        },

        modules: {
          create:
            modules?.map((module: any) => ({
              title: module.title,
              lessons: {
                create:
                  module.lessons?.map((lesson: any) => ({
                    title: lesson.title,
                    content: lesson.content,
                    videoUrl: lesson.videoUrl,
                  })) || [],
              },
            })) || [],
        },

        instructor: {
          connect: {
            id: instructorId,
          },
        },
      },
      include: {
        category: true, // Includes category details in the API response
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: newCourse,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// update course
export const updateTheCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    const courseUpdatedData = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Course ID is required" });
    }

    const {
      title,
      description,
      thumbnail,
      price,
      level,
      status,
      categoryId,
      modules,
    } = courseUpdatedData;

    const updatedCourse = await prisma.$transaction(async (tx) => {
      const courseUpdateData: any = {
        title,
        slug:
          courseUpdatedData?.slug ||
          `${slugify(title || "")}-${id.slice(0, 5)}`,
        description,
        thumbnail,
        price: parseFloat(price) || 0,
        level: level?.toUpperCase(),
        status,
      };

      if (categoryId) {
        courseUpdateData.category = { connect: { id: categoryId } };
      }

      await tx.course.update({
        where: { id },
        data: courseUpdateData,
      });

      if (modules && Array.isArray(modules)) {
        await tx.module.deleteMany({
          where: { courseId: id },
        });

        for (let i = 0; i < modules.length; i++) {
          const mod = modules[i];

          await tx.module.create({
            data: {
              title: mod.title,
              order: i,
              courseId: id,
              lessons: {
                create: (mod.lessons || []).map(
                  (lesson: any, index: number) => ({
                    title: lesson.title,
                    content: lesson.content || "",
                    videoUrl: lesson.videoUrl || null,
                    durationInSec: parseInt(lesson.durationInSec) || 0,
                    isPublished: lesson.isPublished ?? true,
                    order: index,
                  }),
                ),
              },
            },
          });
        }
      }

      // 4. Return updated course layout with confirmed sorting order
      return await tx.course.findUnique({
        where: { id },
        include: {
          modules: {
            orderBy: { order: "asc" },
            include: {
              lessons: { orderBy: { order: "asc" } },
            },
          },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Course curriculum and details saved successfully",
      data: updatedCourse,
    });
  } catch (error: any) {
    console.error("Prisma Transaction Error updating course:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Internal Database Error",
    });
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

export const getCourseCategories = async (req: Request, res: Response) => {
  // console.log("calling categories.....");
  try {
    const categories = await prisma.category.findMany();
    // console.log(categories);
    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (err: any) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
};
