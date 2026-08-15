import { NextResponse } from "next/server";
import { db } from "@/db";
import { books, authors, bookChapters } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { verifyDownloadToken, verifyEntitlement, recordDownload } from "@/services/download.service";

/**
 * Serves the protected eBook. The token alone is NOT sufficient — entitlement
 * is re-verified here, so revoking a purchase immediately kills any
 * outstanding signed links. The storage location is never public.
 */

function escapePdfText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/** Builds a multi-page PDF containing the real chapter text. */
function buildPdf(title: string, author: string, chapters: { title: string; content: string }[]): Buffer {
  const pages: string[] = [];

  // Title page
  let cover = `BT /F1 26 Tf 72 700 Td (${escapePdfText(title)}) Tj ET\n`;
  cover += `BT /F1 13 Tf 72 672 Td (${escapePdfText(author)}) Tj ET\n`;
  cover += `BT /F1 10 Tf 72 640 Td (${escapePdfText("VELORA BOOKS — Certified Digital Edition")}) Tj ET\n`;
  cover += `BT /F1 9 Tf 72 624 Td (${escapePdfText("Licensed to a single account. Delivered via a signed, ownership-verified link.")}) Tj ET\n`;
  pages.push(cover);

  for (const ch of chapters) {
    const lines = [
      "",
      ...wrap(ch.title, 60),
      "",
      ...ch.content.split(/\n\n+/).flatMap((p) => [...wrap(p, 88), ""]),
    ];
    // paginate ~46 lines per page
    for (let i = 0; i < lines.length; i += 46) {
      const slice = lines.slice(i, i + 46);
      let content = "";
      let y = 730;
      slice.forEach((ln, idx) => {
        const isHeading = i === 0 && idx > 0 && idx <= wrap(ch.title, 60).length;
        content += `BT /F1 ${isHeading ? 16 : 10.5} Tf 72 ${y} Td (${escapePdfText(ln)}) Tj ET\n`;
        y -= isHeading ? 22 : 15;
      });
      pages.push(content);
    }
  }

  const objects: string[] = [];
  const pageObjStart = 3;
  const kids = pages.map((_, i) => `${pageObjStart + i * 2} 0 R`).join(" ");

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);

  const fontObjNum = pageObjStart + pages.length * 2;
  pages.forEach((content) => {
    const contentObjNum = objects.length + 2 + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>`
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing download token" }, { status: 400 });

  const payload = verifyDownloadToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Download link expired or invalid" }, { status: 403 });
  }

  // Re-verify ownership at serve time (token is not a standing bypass)
  const entitlement = await verifyEntitlement(payload.sub, payload.bookId);
  if (!entitlement.ok) {
    return NextResponse.json({ error: entitlement.error }, { status: entitlement.status });
  }

  const [book] = await db
    .select({ id: books.id, title: books.title, slug: books.slug, authorName: authors.name })
    .from(books)
    .innerJoin(authors, eq(books.authorId, authors.id))
    .where(eq(books.id, payload.bookId))
    .limit(1);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const chapters = await db
    .select({ title: bookChapters.title, content: bookChapters.content })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, payload.bookId))
    .orderBy(asc(bookChapters.chapterNumber));

  if (chapters.length === 0) {
    return NextResponse.json({ error: "Digital content is not yet available for this title" }, { status: 404 });
  }

  await recordDownload(payload.sub, payload.bookId, request.headers.get("user-agent"));

  const pdf = buildPdf(book.title, book.authorName, chapters);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${book.slug}.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
