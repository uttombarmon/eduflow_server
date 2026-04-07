export type UserRole = "student" | "tutor" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  authoredCourses: Course[];
  posts: Post[];
  password?: string;
  createdAt: Date;
}
export interface ExperienceType {
  company?: string;
  position?: string;
  location?: string;
  startDate?: string;
  endDate?: string | null;
  description?: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  content: string;
  isCompleted: boolean;
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  instructorId: string;
  description: string;
  thumbnail: string;
  category: string;
  totalDuration: string;
  level: string;
  price: number;
  rating: number;
  studentsCount: number;
  lessons: Lesson[];
  progress?: number;
}
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  lastAccessed: Date;
  createdAt: Date;
}
export interface CourseCategories {
  categories: string[];
}
export interface Filters {
  categorie: string;
  level: string;
  price: string;
  sortBy: string;
  search: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  id: string;
  lessonId: string;
  questions: QuizQuestion[];
}

export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning";
  time: string;
}
export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

// types/api.ts
export interface DashboardData {
  stats: {
    label: string;
    value: string;
    icon: "BookOpen" | "Clock" | "Star" | "Award";
    color: string;
    trend: string;
  }[];
  activeCourses: {
    id: string;
    title: string;
    thumbnail: string;
    progress: number;
  }[];
  recommendations: {
    id: string;
    title: string;
    time: string;
    tag: string;
  }[];
}
