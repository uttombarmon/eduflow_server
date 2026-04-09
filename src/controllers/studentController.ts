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

  // 3. Handle Free vs Paid enrollment
  if (course.price === 0) {
    // Create enrollment and increment studentsCount in a transaction
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

    return res.status(201).json({
      success: true,
      message: "Enrolled successfully (Free)",
      data: enrollment
    });
  } else {
    // Paid course - create a PENDING payment record
    const { currency } = req.body;
    const selectedCurrency = currency === "BDT" ? "BDT" : "USD"; // Support both as requested

    const payment = await prisma.payment.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        currency: selectedCurrency,
        status: "PENDING",
        method: "MOCK"
      }
    });

    return res.status(200).json({
      success: true,
      message: "Payment required for this course",
      paymentRequired: true,
      data: {
        paymentId: payment.id,
        courseId: course.id,
        courseTitle: course.title,
        amount: course.price,
        currency: selectedCurrency,
        method: "MOCK"
      }
    });
  }
});

/**
 * Verify a mock payment and enroll the student
 * POST /api/student/verify-payment
 */
export const verifyMockPayment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  const { paymentId } = req.body;

  if (!paymentId) {
    return next(new AppError("Payment ID is required", 400));
  }

  // 1. Find the payment and verify it belongs to the user
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || payment.userId !== userId) {
    return next(new AppError("Payment record not found", 404));
  }

  if (payment.status === "SUCCEEDED") {
    return next(new AppError("This payment has already been processed", 400));
  }

  // 2. Perform atomic transaction: Update payment status and create enrollment
  const enrollment = await prisma.$transaction(async (tx) => {
    // Update payment
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "SUCCEEDED" }
    });

    // Create enrollment
    const newEnrollment = await tx.enrollment.create({
      data: {
        userId,
        courseId: payment.courseId,
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

    // Increment course student count
    await tx.course.update({
      where: { id: payment.courseId },
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
    message: "Payment verified and enrollment successful",
    data: enrollment
  });
});

/**
 * Get all courses the student is enrolled in
 * GET /api/student/enrolled-courses
 */
export const getEnrolledCourses = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          instructor: {
            select: { name: true, avatar: true }
          },
          _count: {
            select: { lessons: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json({
    success: true,
    data: enrollments
  });
});

/**
 * Update progress of a lesson
 * POST /api/student/course/:courseId/lesson/:lessonId/progress
 */
export const updateLessonProgress = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  const { courseId, lessonId } = req.params;

  // 1. Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId }
    }
  });

  if (!enrollment) {
    return next(new AppError("You are not enrolled in this course", 403));
  }

  // 2. Mark lesson as completed (Upsert)
  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: { userId, lessonId }
    },
    update: { isCompleted: true },
    create: {
      userId,
      lessonId,
      isCompleted: true
    }
  });

  // 3. Recalculate course progress
  // Get all lessons for this course
  const totalLessons = await prisma.lesson.count({
    where: { courseId }
  });

  // Get completed lessons for this course
  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      lesson: { courseId },
      isCompleted: true
    }
  });

  const progressPercentage = totalLessons > 0 
    ? (completedLessons / totalLessons) * 100 
    : 0;

  // 4. Update core enrollment progress
  const updatedEnrollment = await prisma.enrollment.update({
    where: {
      userId_courseId: { userId, courseId }
    },
    data: {
      progress: progressPercentage,
      lastAccessed: new Date()
    }
  });

  res.status(200).json({
    success: true,
    message: "Lesson progress updated",
    data: {
      progress: updatedEnrollment.progress,
      completedLessons,
      totalLessons
    }
  });
});
