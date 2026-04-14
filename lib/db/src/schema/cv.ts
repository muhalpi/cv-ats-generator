import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cvsTable = pgTable("cvs", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  jobTitle: text("job_title").notNull(),
  summary: text("summary").notNull().default(""),
  skills: jsonb("skills").notNull().default([]).$type<string[]>(),
  languages: jsonb("languages").notNull().default([]).$type<string[]>(),
  workExperience: jsonb("work_experience").notNull().default([]).$type<WorkExperienceEntry[]>(),
  education: jsonb("education").notNull().default([]).$type<EducationEntry[]>(),
  extraSections: jsonb("extra_sections").notNull().default([]).$type<ExtraSection[]>(),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type WorkExperienceEntry = {
  company: string;
  position: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description: string;
};

export type EducationEntry = {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  gpa?: string | null;
};

export type ExtraSectionEntry = {
  title: string;
  subtitle?: string | null;
  date?: string | null;
  description?: string | null;
};

export type ExtraSection = {
  sectionTitle: string;
  entries: ExtraSectionEntry[];
};

export const insertCvSchema = createInsertSchema(cvsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCv = z.infer<typeof insertCvSchema>;
export type Cv = typeof cvsTable.$inferSelect;
