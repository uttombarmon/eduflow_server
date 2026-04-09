import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import type { DashboardData } from "../types/TypesAll.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/AppError.js";

export const getStudentDashboardData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id; // Assuming user is attached via auth middleware

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Fetch data in parallel for performance
    const [enrollments, totalCompletedLessons, userProfile] = await Promise.all(
      [
        prisma.enrollment.findMany({
          where: { userId },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                totalDuration: true,
                category: true,
              },
            },
          },
          orderBy: { lastAccessed: "desc" },
        }),
        prisma.lessonProgress.count({
          where: { userId, isCompleted: true },
        }),
        prisma.profile.findUnique({
          where: { userId },
          select: { skills: true },
        }),
      ],
    );

    // 2. Format Active Courses
    const activeCourses = enrollments
      .filter((enrol) => enrol.progress < 100)
      .slice(0, 3)
      .map((enrol) => ({
        id: enrol.course.id,
        title: enrol.course.title,
        thumbnail: enrol.course.thumbnail,
        progress: enrol.progress,
      }));

    // 3. Simple Recommendation Logic
    // Suggest courses in the same category as the most recent enrollment
    const recentCategory = enrollments[0]?.course.category || "Development";
    const recommendedCourses = await prisma.course.findMany({
      where: {
        category: recentCategory,
        status: "publish",
        enrollments: { none: { userId } }, // Don't suggest courses already enrolled
      },
      take: 2,
      select: { id: true, title: true, totalDuration: true, level: true },
    });

    // 4. Construct Stats Array
    const stats: Array<{
      label: string;
      value: string;
      icon: "BookOpen" | "Clock" | "Star" | "Award";
      color: string;
      trend: string;
    }> = [
      {
        label: "Courses Enrolled",
        value: enrollments.length.toString(),
        icon: "BookOpen",
        color: "text-indigo-600",
        trend: "+1 this month",
      },
      {
        label: "Lessons Finished",
        value: totalCompletedLessons.toString(),
        icon: "Clock",
        color: "text-sky-600",
        trend: "Steady progress",
      },
      {
        label: "Avg. Course Progress",
        value: enrollments.length
          ? `${Math.round(enrollments.reduce((acc, curr) => acc + curr.progress, 0) / enrollments.length)}%`
          : "0%",
        icon: "Star",
        color: "text-amber-600",
        trend: "+5% increase",
      },
      {
        label: "Certificates",
        value: enrollments.filter((e) => e.progress === 100).length.toString(),
        icon: "Award",
        color: "text-emerald-600",
        trend: "Keep going!",
      },
    ];

    const responseData: DashboardData = {
      stats,
      activeCourses,
      recommendations: recommendedCourses.map((c) => ({
        id: c.id,
        title: c.title,
        time: c.totalDuration,
        tag: c.level,
      })),
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Dashboard Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * Enroll a student in a course
 * POST /api/student/enroll
 */
export const enrollInCourse = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  const { courseId } = req.body;

  if (!courseId) {
    return next(new AppError("Course ID is required", 400));
  }

  // 1. Check if course exists and is published
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true, studentsCount: true }
  });

  if (!course) {
    return next(new AppError("Course not found", 404));
  }

  if (course.status !== "publish") {
    return next(new AppError("Course is not available for enrollment", 400));
  }

  // 2. Check if already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId
      }
    }
  });

  if (existingEnrollment) {
    return next(new AppError("You are already enrolled in this course", 400));
  }

  // 3. Create enrollment and increment studentsCount in a transaction
  const enrollment = await prisma.$transaction(async (tx) => {
    const newEnrollment = await tx.enrollment.create({
      data: {
        userId,
        courseId,
        progress: 0,
      },
      include: {
        course: {
          select: {
            title: true,
            thumbnail: true,
          }
        }
      }
    });

    await tx.course.update({
      where: { id: courseId },
      data: {
        studentsCount: {
          increment: 1
        }
      }
    });

    return newEnrollment;
  });

  res.status(201).json({
    success: true,
    message: "Enrolled successfully",
    data: enrollment
  });
});
