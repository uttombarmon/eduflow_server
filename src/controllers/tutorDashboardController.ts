import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export async function Dasboard(req: any, res: Response) {
  console.log("calling");
  try {
    const instructorId = req.user.id;
    console.log("instructor: ", instructorId);
    if (!instructorId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No instructor ID found" });
    }

    // total earings
    const totalEarnings = await prisma.enrollment.findMany({
      where: { course: { instructorId: instructorId } },
      include: { course: true },
    });

    const earnings = totalEarnings.reduce(
      (acc, curr) => acc + curr.course.price,
      0,
    );

    // active status
    const activeStudents = await prisma.enrollment.count({
      where: {
        course: { instructorId: instructorId },
      },
    });

    // average course rating
    const averageRating = await prisma.course.aggregate({
      where: { instructorId: instructorId },
      _avg: {
        rating: true,
      },
    });

    const finalRating = averageRating._avg.rating || 0;

    

    console.log("data", totalEarnings, earnings, activeStudents, averageRating);
    res.status(200).json({
      totalEarnings,
      earningPercentage: earnings,
      activeStudents,
      averageRating,
      finalRating,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
}
