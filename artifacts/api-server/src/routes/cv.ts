import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, cvsTable } from "@workspace/db";
import {
  CreateCVBody,
  GetCVParams,
  UpdateCVParams,
  UpdateCVBody,
  DeleteCVParams,
  GetCVHtmlParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cv", async (_req, res): Promise<void> => {
  const cvs = await db
    .select({
      id: cvsTable.id,
      fullName: cvsTable.fullName,
      email: cvsTable.email,
      jobTitle: cvsTable.jobTitle,
      createdAt: cvsTable.createdAt,
      updatedAt: cvsTable.updatedAt,
    })
    .from(cvsTable)
    .orderBy(cvsTable.createdAt);
  res.json(cvs.map(cv => ({
    ...cv,
    createdAt: cv.createdAt.toISOString(),
    updatedAt: cv.updatedAt.toISOString(),
  })));
});

router.post("/cv", async (req, res): Promise<void> => {
  const parsed = CreateCVBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [cv] = await db.insert(cvsTable).values({
    fullName: data.fullName,
    email: data.email,
    phone: data.phone ?? null,
    location: data.location ?? null,
    jobTitle: data.jobTitle,
    summary: data.summary,
    skills: data.skills,
    languages: data.languages,
    workExperience: data.workExperience ?? [],
    education: data.education ?? [],
    linkedinUrl: data.linkedinUrl ?? null,
    portfolioUrl: data.portfolioUrl ?? null,
  }).returning();

  res.status(201).json(serializeCV(cv));
});

router.get("/cv/:id", async (req, res): Promise<void> => {
  const params = GetCVParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cv] = await db
    .select()
    .from(cvsTable)
    .where(eq(cvsTable.id, params.data.id));

  if (!cv) {
    res.status(404).json({ error: "CV not found" });
    return;
  }

  res.json(serializeCV(cv));
});

router.patch("/cv/:id", async (req, res): Promise<void> => {
  const params = UpdateCVParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCVBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Partial<typeof cvsTable.$inferInsert> = {};

  if (data.fullName !== undefined) updateData.fullName = data.fullName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.skills !== undefined) updateData.skills = data.skills;
  if (data.languages !== undefined) updateData.languages = data.languages;
  if (data.workExperience !== undefined) updateData.workExperience = data.workExperience;
  if (data.education !== undefined) updateData.education = data.education;
  if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl;
  if (data.portfolioUrl !== undefined) updateData.portfolioUrl = data.portfolioUrl;

  const [cv] = await db
    .update(cvsTable)
    .set(updateData)
    .where(eq(cvsTable.id, params.data.id))
    .returning();

  if (!cv) {
    res.status(404).json({ error: "CV not found" });
    return;
  }

  res.json(serializeCV(cv));
});

router.delete("/cv/:id", async (req, res): Promise<void> => {
  const params = DeleteCVParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cv] = await db
    .delete(cvsTable)
    .where(eq(cvsTable.id, params.data.id))
    .returning();

  if (!cv) {
    res.status(404).json({ error: "CV not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/cv/:id/html", async (req, res): Promise<void> => {
  const params = GetCVHtmlParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cv] = await db
    .select()
    .from(cvsTable)
    .where(eq(cvsTable.id, params.data.id));

  if (!cv) {
    res.status(404).json({ error: "CV not found" });
    return;
  }

  const html = generateCVHtml(cv);
  res.json({ html });
});

function serializeCV(cv: typeof cvsTable.$inferSelect) {
  return {
    ...cv,
    createdAt: cv.createdAt.toISOString(),
    updatedAt: cv.updatedAt.toISOString(),
  };
}

function generateCVHtml(cv: typeof cvsTable.$inferSelect): string {
  const workExpHtml = (cv.workExperience as { company: string; position: string; startDate: string; endDate?: string | null; isCurrent: boolean; description: string }[])
    .map(exp => `
      <div class="entry">
        <div class="entry-header">
          <div>
            <div class="entry-title">${escapeHtml(exp.position)}</div>
            <div class="entry-subtitle">${escapeHtml(exp.company)}</div>
          </div>
          <div class="entry-date">${escapeHtml(exp.startDate)} – ${exp.isCurrent ? 'Sekarang' : escapeHtml(exp.endDate ?? '')}</div>
        </div>
        <ul class="entry-desc">
          ${exp.description
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => `<li>${escapeHtml(line)}</li>`)
            .join('')}
        </ul>
      </div>
    `).join('');

  const educationHtml = (cv.education as { institution: string; degree: string; field: string; startDate: string; endDate?: string | null; isCurrent: boolean; gpa?: string | null }[])
    .map(edu => `
      <div class="entry">
        <div class="entry-header">
          <div>
            <div class="entry-title">${escapeHtml(edu.degree)} – ${escapeHtml(edu.field)}</div>
            <div class="entry-subtitle">${escapeHtml(edu.institution)}</div>
            ${edu.gpa ? `<div class="entry-gpa">IPK: ${escapeHtml(edu.gpa)}</div>` : ''}
          </div>
          <div class="entry-date">${escapeHtml(edu.startDate)} – ${edu.isCurrent ? 'Sekarang' : escapeHtml(edu.endDate ?? '')}</div>
        </div>
      </div>
    `).join('');

  const skills = (cv.skills as string[]).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('');
  const languages = (cv.languages as string[]).map(l => `<span class="tag">${escapeHtml(l)}</span>`).join('');

  const stripUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '');
  const linksHtml = [
    cv.linkedinUrl ? `<a href="${escapeHtml(cv.linkedinUrl)}" class="contact-link">${escapeHtml(stripUrl(cv.linkedinUrl))}</a>` : '',
    cv.portfolioUrl ? `<a href="${escapeHtml(cv.portfolioUrl)}" class="contact-link">${escapeHtml(stripUrl(cv.portfolioUrl))}</a>` : '',
  ].filter(Boolean).join(' · ');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CV – ${escapeHtml(cv.fullName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #1a1a2e; background: white; line-height: 1.5; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
  .header { border-bottom: 2px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; }
  .name { font-size: 24pt; font-weight: 700; color: #1e40af; letter-spacing: -0.5px; }
  .job-title { font-size: 13pt; color: #3b82f6; font-weight: 500; margin-top: 2px; }
  .contact { margin-top: 8px; font-size: 9.5pt; color: #475569; display: flex; flex-wrap: wrap; gap: 8px 16px; }
  .contact a { color: #475569; text-decoration: none; }
  .contact-link { color: #475569 !important; }
  section { margin-bottom: 20px; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 12px; font-weight: 700; }
  .summary { color: #374151; font-size: 10.5pt; line-height: 1.6; }
  .entry { margin-bottom: 12px; }
  .entry-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .entry-title { font-weight: 700; font-size: 10.5pt; color: #1a1a2e; }
  .entry-subtitle { color: #475569; font-size: 10pt; }
  .entry-date { font-size: 9.5pt; color: #6b7280; white-space: nowrap; margin-left: 8px; }
  .entry-gpa { margin-top: 2px; font-size: 9.5pt; color: #6b7280; }
  .entry-desc { margin: 6px 0 0 0; padding-left: 18px; font-size: 10pt; color: #374151; line-height: 1.5; list-style-type: disc; }
  .entry-desc li { margin-bottom: 4px; display: list-item; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 2px 8px; font-size: 9.5pt; color: #1e40af; }
  @page {
    size: A4;
    margin: 18mm 15mm;
  }
  @media print {
    body { font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: 100%; padding: 0; margin: 0; }
    a { color: #475569 !important; }
    .contact-link { color: #475569 !important; }
    .tag { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="name">${escapeHtml(cv.fullName)}</div>
    <div class="job-title">${escapeHtml(cv.jobTitle)}</div>
    <div class="contact">
      <span>${escapeHtml(cv.email)}</span>
      ${cv.phone ? `<span>${escapeHtml(cv.phone)}</span>` : ''}
      ${cv.location ? `<span>${escapeHtml(cv.location)}</span>` : ''}
      ${linksHtml}
    </div>
  </div>

  ${cv.summary ? `
  <section>
    <h2>Ringkasan Profesional</h2>
    <div class="summary">${escapeHtml(cv.summary).replace(/\n/g, '<br>')}</div>
  </section>
  ` : ''}

  ${(cv.workExperience as unknown[]).length > 0 ? `
  <section>
    <h2>Pengalaman Kerja</h2>
    ${workExpHtml}
  </section>
  ` : ''}

  ${(cv.education as unknown[]).length > 0 ? `
  <section>
    <h2>Pendidikan</h2>
    ${educationHtml}
  </section>
  ` : ''}

  ${(cv.skills as string[]).length > 0 ? `
  <section>
    <h2>Keahlian</h2>
    <div class="tags">${skills}</div>
  </section>
  ` : ''}

  ${(cv.languages as string[]).length > 0 ? `
  <section>
    <h2>Bahasa</h2>
    <div class="tags">${languages}</div>
  </section>
  ` : ''}
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default router;
