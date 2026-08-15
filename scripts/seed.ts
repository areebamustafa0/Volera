import "dotenv/config";
import { db } from "../src/db";
import {
  authors,
  categories,
  books,
  bookFormats,
} from "../src/db/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  const [author] = await db
    .insert(authors)
    .values({
      name: "George Orwell",
      slug: "george-orwell",
      bio: "English novelist and essayist.",
    })
    .returning();

  const [category] = await db
    .insert(categories)
    .values({
      name: "Fiction",
      slug: "fiction",
      description: "Classic and contemporary fiction.",
    })
    .returning();

  const [book] = await db
    .insert(books)
    .values({
      title: "1984",
      slug: "1984",
      description: "A classic dystopian novel.",
      isbn: "9780451524935",
      publisher: "Signet Classic",
      authorId: author.id,
      categoryId: category.id,
      coverImage: "/books/1984.jpg",
      publicationDate: "1949",
      language: "English",
      pages: 328,
      rating: "4.80",
      reviewCount: 120,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
    })
    .returning();

  await db.insert(bookFormats).values([
    {
      bookId: book.id,
      format: "EBOOK",
      price: "9.99",
      stock: 0,
    },
    {
      bookId: book.id,
      format: "HARDCOVER",
      price: "24.99",
      stock: 50,
    },
  ]);

  console.log("✅ Database seeded successfully!");
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});