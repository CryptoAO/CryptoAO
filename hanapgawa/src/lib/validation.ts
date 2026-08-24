import { z } from "zod";
import { isValidCityInRegion } from "./psgc";

export const phoneSchema = z
  .string()
  .min(10)
  .max(16)
  .describe("PH mobile number, e.g. 09171234567");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password too long"); // bcrypt input limit

const nameSchema = z.string().trim().min(1).max(60);

export const locationSchema = z
  .object({
    regionCode: z.string().min(2).max(2),
    cityCode: z.string().min(2).max(64),
    barangay: z.string().trim().max(80).optional(),
    lat: z.number().min(4).max(21).optional(), // PH bounding box
    lng: z.number().min(116).max(127).optional(),
  })
  .refine((v) => isValidCityInRegion(v.cityCode, v.regionCode), {
    message: "City does not belong to the selected region",
  });

export const registerSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  regionCode: z.string(),
  cityCode: z.string(),
  wantsProvider: z.boolean().default(false),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(72),
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "6-digit code"),
});

export const jobCreateSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().trim().min(5, "Give your job a short title").max(90),
  description: z.string().trim().min(10, "Describe what you need").max(3000),
  regionCode: z.string(),
  cityCode: z.string(),
  barangay: z.string().trim().max(80).optional(),
  addressNote: z.string().trim().max(300).optional(),
  lat: z.number().min(4).max(21).optional(),
  lng: z.number().min(116).max(127).optional(),
  payType: z.enum(["FIXED", "HOURLY"]),
  budgetPhp: z.number().positive().max(1_000_000),
  durationMin: z.number().int().min(15).max(24 * 60 * 14).optional(),
  scheduledAt: z.string().datetime().optional(),
  flexible: z.boolean().default(true),
});

export const offerCreateSchema = z.object({
  jobId: z.string().min(1),
  pricePhp: z.number().positive().max(1_000_000),
  message: z.string().trim().min(1).max(1000),
});

export const messageCreateSchema = z.object({
  jobId: z.string().min(1),
  toUserId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export const reviewCreateSchema = z.object({
  jobId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const providerProfileSchema = z.object({
  bio: z.string().trim().max(1000).optional(),
  categories: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        headline: z.string().trim().max(120).optional(),
        ratePhp: z.number().positive().max(1_000_000).optional(),
        rateUnit: z.enum(["PER_HOUR", "PER_JOB", "PER_KILO", "PER_DAY"]).optional(),
        yearsExp: z.number().int().min(0).max(60).optional(),
      }),
    )
    .max(8),
  availability: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startMin: z.number().int().min(0).max(1439),
        endMin: z.number().int().min(1).max(1440),
      }).refine((s) => s.endMin > s.startMin, { message: "End must be after start" }),
    )
    .max(28),
});

export const kycSubmitSchema = z.object({
  level: z.union([z.literal(2), z.literal(3)]),
  docType: z.enum(["PHILSYS", "DRIVERS_LICENSE", "UMID", "PASSPORT", "NBI", "POLICE"]),
  idLastFour: z.string().regex(/^\d{4}$/).optional(),
});

export const topupSchema = z.object({
  amountPhp: z.number().min(50, "Minimum top-up is ₱50").max(50_000),
});

export const payoutRequestSchema = z.object({
  amountPhp: z.number().min(100, "Minimum cash-out is ₱100").max(500_000),
  channel: z.enum(["GCASH", "MAYA", "BANK"]),
  accountRef: z.string().trim().min(4).max(64),
});

export const reportSchema = z.object({
  targetId: z.string().min(1),
  jobId: z.string().optional(),
  reason: z.enum(["SCAM", "HARASSMENT", "NO_SHOW", "OFF_PLATFORM", "UNSAFE", "OTHER"]),
  details: z.string().trim().max(2000).optional(),
});
