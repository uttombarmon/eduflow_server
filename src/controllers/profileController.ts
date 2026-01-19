import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { ExperienceType } from "../types/TypesAll.js";

// add profile informations
export const addProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    if (!userId || userId == undefined)
      throw new AppError("User Id not found", 404);
    const {
      bio,
      headline,
      skills,
      hobbies,
      location,
      phoneNumber,
      website,
      github,
      linkedin,
      twitter,
    } = req.body;

    const profile = await prisma.profile.upsert({
      where: {
        userId: userId,
      },
      update: {
        bio,
        headline,
        skills,
        hobbies,
        location,
        phoneNumber,
        website,
        github,
        linkedin,
        twitter,
      },
      create: {
        userId: userId,
        bio,
        headline,
        skills,
        hobbies,
        location,
        phoneNumber,
        website,
        github,
        linkedin,
        twitter,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Profile saved successfully",
      data: profile,
    });
  } catch (error: any) {
    console.error("Add Profile Error:", error);
    throw new AppError("Could not save profile details", 500);
  }
};
// get profile infomations
export const getFullProfile = async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId || userId != undefined)
    throw new AppError("User Not available", 404);
  const fullProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      avatar: true,
      profile: {
        include: {
          experiences: { orderBy: { startDate: "desc" } },
          projects: true,
          educations: { orderBy: { startDate: "desc" } },
        },
      },
    },
  });

  res.json(fullProfile);
};

// update profile informations
export const updateProfileInfo = async (req: any, res: Response) => {
  const { bio, headline, skills, hobbies, location, phoneNumber } = req.body;

  const profile = await prisma.profile.upsert({
    where: { userId: req.user.id },
    update: { bio, headline, skills, hobbies, location, phoneNumber },
    create: {
      userId: req.user.id,
      bio,
      headline,
      skills,
      hobbies,
      location,
      phoneNumber,
    },
  });

  res.status(200).json({ status: "success", data: profile });
};

// add experience
export const addExperience = async (req: any, res: Response) => {
  const { company, position, startDate, description } = req.body;

  const userProfile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });

  if (!userProfile) throw new AppError("Profile not found", 404);

  const newExp = await prisma.experience.create({
    data: {
      company,
      position,
      startDate: new Date(startDate),
      description,
      profileId: userProfile.id,
    },
  });

  res.status(201).json(newExp);
};

// update experience
export const updateExperience = async (
  req: Request<{ ex_id: string }, {}, ExperienceType>,
  res: Response,
) => {
  try {
    const { ex_id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const { company, position, location, startDate, endDate, description } =
      req.body;
    const updateData: any = {};
    if (company !== undefined) updateData.company = company;
    if (position !== undefined) updateData.position = position;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;

    // Handle Dates specifically
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(endDate) : null;

    const updatedExperience = await prisma.experience.update({
      where: {
        id: ex_id,
        profile: {
          userId: userId,
        },
      },
      data: updateData,
    });

    res.status(200).json({
      status: "success",
      message: "Experience updated successfully",
      data: updatedExperience,
    });
  } catch (error: any) {
    console.error("Update Experience Error:", error);

    if (error.code === "P2025") {
      throw new AppError("Experience record not found or unauthorized", 404);
    }

    if (error instanceof AppError) throw error;
    throw new AppError("Failed to update experience", 500);
  }
};

// delete experience
export const deleteExperience = async (req: any, res: Response) => {
  const { ex_id } = req.params;
  if (!ex_id && ex_id != undefined)
    throw new AppError("Failed to get experience id", 404);
  await prisma.experience.delete({ where: { id: ex_id } });
  res.status(204).json({ status: "success", data: null });
};

// add project
export const addProject = async (req: any, res: Response) => {
  const { title, description, link, githubLink, technologies } = req.body;

  const profile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });
  if (!profile) throw new AppError("Profile not found", 404);

  const project = await prisma.project.create({
    data: {
      title,
      description,
      link,
      githubLink,
      technologies,
      profileId: profile.id,
    },
  });

  res.status(201).json({ status: "success", data: project });
};

// update project
export const updateProject = async (req: any, res: Response) => {
  const { pid } = req.params;
  const updateData = req.body;

  const project = await prisma.project.findFirst({
    where: {
      id: pid,
      profile: { userId: req.user.pid },
    },
  });

  if (!project) throw new AppError("Project not found or unauthorized", 404);

  const updatedProject = await prisma.project.update({
    where: { id: pid },
    data: updateData,
  });

  res.status(200).json({ status: "success", data: updatedProject });
};

// delete project
export const deleteProject = async (req: any, res: Response) => {
  const { pid } = req.params;
  const userId = req.user.id;

  const project = await prisma.project.findFirst({
    where: {
      id: pid,
      profile: {
        userId: userId,
      },
    },
  });

  if (!project) {
    throw new AppError(
      "Project not found or you do not have permission to delete it",
      404,
    );
  }

  await prisma.project.delete({
    where: {
      id: pid,
    },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
};

//filter projects by technologies
export const getProjectsByTech = async (req: Request, res: Response) => {
  const { tech } = req.query;

  const projects = await prisma.project.findMany({
    where: {
      technologies: {
        has: tech as string,
      },
    },
    include: {
      profile: {
        select: { user: { select: { name: true, avatar: true } } },
      },
    },
  });

  res
    .status(200)
    .json({ status: "success", count: projects.length, data: projects });
};
