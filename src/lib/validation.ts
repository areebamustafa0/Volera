import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({ email: z.string().email().max(255) });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(255),
  password: z.string().min(8).max(128),
});

export const addToCartSchema = z.object({
  bookId: z.number().int().positive(),
  formatId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20).default(1),
});

export const createCheckoutSchema = z.object({
  couponCode: z.string().trim().max(40).optional(),
});

export const reviewSchema = z.object({
  bookId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2).max(140),
  comment: z.string().min(10).max(2000),
});

export const readingProgressSchema = z.object({
  bookId: z.number().int().positive(),
  currentChapter: z.string().max(120).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  lastReadPosition: z.string().max(500).optional(),
  bookmarked: z.boolean().optional(),
  status: z.enum(["READING", "FINISHED"]).optional(),
});

export const newsletterSchema = z.object({ email: z.string().email().max(255) });

export const couponCreateSchema = z.object({
  code: z.string().trim().min(2).max(40),
  discountPercent: z.number().int().min(1).max(90).optional(),
  fixedAmount: z.number().min(0.01).max(10000).optional(),
  minOrderAmount: z.number().min(0).max(100000).default(0),
  maxDiscount: z.number().min(0).max(100000).optional(),
  usageLimit: z.number().int().min(1).max(1000000).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const bookCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  isbn: z.string().min(10).max(20),
  publisher: z.string().min(1).max(120),
  authorId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  coverImage: z.string().url().max(500),
  publicationDate: z.string().max(60),
  pages: z.number().int().min(1).max(10000),
  language: z.string().max(40).default("English"),
  hardcoverPrice: z.number().min(0).max(10000).optional(),
  paperbackPrice: z.number().min(0).max(10000).optional(),
  ebookPrice: z.number().min(0).max(10000).optional(),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
});

export const reviewModerationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const stockUpdateSchema = z.object({
  formatId: z.number().int().positive(),
  stock: z.number().int().min(0).max(100000),
});
