import { db } from "./index";
import { authors, categories, collections, books, bookFormats, users, coupons, bookChapters, libraries, orders, orderItems, blogPosts } from "./schema";
import bcrypt from "bcryptjs";
import { sql, eq, inArray } from "drizzle-orm";
import { chaptersForBook, countWords } from "./chapters";

export async function seedDatabase() {
  console.log("Seeding Velora Books database...");

  // 1. Create Users
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const customerPassword = await bcrypt.hash("Customer123!", 10);

  const [adminUser] = await db
    .insert(users)
    .values({
      name: "Velora Curator",
      email: "admin@velorabooks.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  const [customerUser] = await db
    .insert(users)
    .values({
      name: "Eleanor Vance",
      email: "customer@velorabooks.com",
      passwordHash: customerPassword,
      role: "CUSTOMER",
      emailVerified: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  // 2. Create Categories
  const categoryData = [
    { name: "Fiction", slug: "fiction", description: "Immersive literary fiction and timeless storytelling." },
    { name: "Romance", slug: "romance", description: "Profound explorations of love, longing, and human connection." },
    { name: "Mystery", slug: "mystery", description: "Enigmatic puzzles, psychological suspense, and detective journeys." },
    { name: "Fantasy", slug: "fantasy", description: "Mythic realms, magical realism, and epic world-building." },
    { name: "Science Fiction", slug: "science-fiction", description: "Speculative futures, cosmos exploration, and philosophical tech." },
    { name: "Business", slug: "business", description: "Strategic brilliance, market dynamics, and leadership." },
    { name: "Self Development", slug: "self-development", description: "Mindfulness, habit formation, and personal mastery." },
    { name: "Technology", slug: "technology", description: "Computer science, AI philosophy, and digital engineering." },
    { name: "History", slug: "history", description: "Chronicles of civilization, empires, and forgotten epochs." },
  ];

  const createdCategories = [];
  for (const cat of categoryData) {
    const [inserted] = await db
      .insert(categories)
      .values(cat)
      .onConflictDoNothing()
      .returning();
    if (inserted) createdCategories.push(inserted);
  }

  // 3. Create Authors
  const authorData = [
    { name: "Matt Haig", slug: "matt-haig", bio: "Bestselling author exploring mental health, time, and human possibility." },
    { name: "Rebecca Yarros", slug: "rebecca-yarros", bio: "Award-winning romance and fantasy novelist known for emotional depth." },
    { name: "Freida McFadden", slug: "freida-mcfadden", bio: "Physician and psychological suspense thriller writer." },
    { name: "Stephanie Garber", slug: "stephanie-garber", bio: "Master of whimsical and enchanting romantic fantasy worlds." },
    { name: "Gabrielle Zevin", slug: "gabrielle-zevin", bio: "Acclaimed literary fiction writer and storyteller." },
    { name: "Bonnie Garmus", slug: "bonnie-garmus", bio: "Copywriter, creative director, and witty novelist." },
    { name: "James Clear", slug: "james-clear", bio: "Habit formation expert and high-performance researcher." },
    { name: "Kazuo Ishiguro", slug: "kazuo-ishiguro", bio: "Nobel Prize-winning novelist of profound emotional resonance." },
    { name: "Donna Tartt", slug: "donna-tartt", bio: "Pulitzer Prize-winning author of meticulous literary masterpieces." },
    { name: "Frank Herbert", slug: "frank-herbert", bio: "Legendary science fiction visionary and creator of Dune." },
  ];

  const createdAuthors = [];
  for (const auth of authorData) {
    const [inserted] = await db
      .insert(authors)
      .values(auth)
      .onConflictDoNothing()
      .returning();
    if (inserted) createdAuthors.push(inserted);
  }

  // 4. Create Collections
  const collectionData = [
    { title: "The Midnight Collection", slug: "midnight-collection", description: "Stories for after dark, mystery, and midnight reading.", isFeatured: true },
    { title: "Modern Classics", slug: "modern-classics", description: "Timeless stories, beautifully preserved for generations.", isFeatured: true },
    { title: "For the Curious Mind", slug: "curious-mind", description: "Ideas that change the way you think about the universe.", isFeatured: true },
    { title: "The Entrepreneur's Shelf", slug: "entrepreneurs-shelf", description: "Books for builders, visionaries, and leaders.", isFeatured: true },
  ];

  const createdCollections = [];
  for (const col of collectionData) {
    const [inserted] = await db
      .insert(collections)
      .values(col)
      .onConflictDoNothing()
      .returning();
    if (inserted) createdCollections.push(inserted);
  }

  // 5. Create Books
  const booksData = [
    {
      title: "The Midnight Library",
      slug: "the-midnight-library",
      description: "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.",
      isbn: "978-0525559474",
      publisher: "Viking",
      authorSlug: "matt-haig",
      categorySlug: "fiction",
      collectionSlug: "midnight-collection",
      coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
      publicationDate: "September 2020",
      pages: 304,
      rating: "4.80",
      reviewCount: 2430,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
    },
    {
      title: "Fourth Wing",
      slug: "fourth-wing",
      description: "Twenty-year-old Violet Sorrengail was supposed to live a quiet life among books and scribes. Now, the commanding general—her all-too-tough mother—has ordered Violet to join the hundreds of candidates striving to become the elite of Navarre: dragon riders.",
      isbn: "978-1649374046",
      publisher: "Entangled: Red Tower Books",
      authorSlug: "rebecca-yarros",
      categorySlug: "fantasy",
      collectionSlug: "midnight-collection",
      coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
      publicationDate: "May 2023",
      pages: 528,
      rating: "4.85",
      reviewCount: 3820,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: true,
    },
    {
      title: "The Housemaid is Watching",
      slug: "the-housemaid-is-watching",
      description: "Welcome to our new neighborhood. Millie and her family have finally settled into their dream home. But secrets lurk behind every manicured lawn.",
      isbn: "978-1538767351",
      publisher: "Poisoned Pen Press",
      authorSlug: "freida-mcfadden",
      categorySlug: "mystery",
      collectionSlug: "midnight-collection",
      coverImage: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=800",
      publicationDate: "June 2024",
      pages: 336,
      rating: "4.62",
      reviewCount: 1420,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: true,
    },
    {
      title: "The Ballad of Never After",
      slug: "the-ballad-of-never-after",
      description: "Not every fairytale comes to an end. Evangeline Fox and the Prince of Hearts return in this breathtaking sequel to Once Upon a Broken Heart.",
      isbn: "978-1250840981",
      publisher: "Flatiron Books",
      authorSlug: "stephanie-garber",
      categorySlug: "fantasy",
      collectionSlug: "modern-classics",
      coverImage: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=800",
      publicationDate: "September 2022",
      pages: 416,
      rating: "4.74",
      reviewCount: 1980,
      isFeatured: false,
      isBestseller: true,
      isNewArrival: true,
    },
    {
      title: "Tomorrow, and Tomorrow, and Tomorrow",
      slug: "tomorrow-and-tomorrow-and-tomorrow",
      description: "In this exhilarating novel, two friends—often in love, but never lovers—come together as creative partners in the world of video game design.",
      isbn: "978-0593321203",
      publisher: "Knopf",
      authorSlug: "gabrielle-zevin",
      categorySlug: "fiction",
      collectionSlug: "modern-classics",
      coverImage: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=800",
      publicationDate: "July 2022",
      pages: 416,
      rating: "4.55",
      reviewCount: 3100,
      isFeatured: true,
      isBestseller: false,
      isNewArrival: false,
    },
    {
      title: "Lessons in Chemistry",
      slug: "lessons-in-chemistry",
      description: "Chemist Elizabeth Zott is not your average woman. In fact, Elizabeth Zott is the first to point out that there is no such thing as an average woman.",
      isbn: "978-0385547345",
      publisher: "Doubleday",
      authorSlug: "bonnie-garmus",
      categorySlug: "fiction",
      collectionSlug: "modern-classics",
      coverImage: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
      publicationDate: "April 2022",
      pages: 390,
      rating: "4.68",
      reviewCount: 4500,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
    },
    {
      title: "Atomic Habits",
      slug: "atomic-habits",
      description: "No matter your goals, Atomic Habits offers a proven framework for improving every day. James Clear reveals practical strategies that will teach you exactly how to form good habits.",
      isbn: "978-0735211292",
      publisher: "Avery",
      authorSlug: "james-clear",
      categorySlug: "self-development",
      collectionSlug: "curious-mind",
      coverImage: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800",
      publicationDate: "October 2018",
      pages: 320,
      rating: "4.92",
      reviewCount: 9200,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
    },
    {
      title: "Dune",
      slug: "dune",
      description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the spice melange.",
      isbn: "978-0441172719",
      publisher: "Chilton Books",
      authorSlug: "frank-herbert",
      categorySlug: "science-fiction",
      collectionSlug: "curious-mind",
      coverImage: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=800",
      publicationDate: "August 1965",
      pages: 412,
      rating: "4.89",
      reviewCount: 7800,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
    },
    {
      title: "The Secret History",
      slug: "the-secret-history",
      description: "Under the influence of a charismatic classics professor, a group of eccentric clever misfits at a New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries.",
      isbn: "978-1400031702",
      publisher: "Knopf",
      authorSlug: "donna-tartt",
      categorySlug: "mystery",
      collectionSlug: "modern-classics",
      coverImage: "https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&q=80&w=800",
      publicationDate: "September 1992",
      pages: 559,
      rating: "4.71",
      reviewCount: 2900,
      isFeatured: false,
      isBestseller: true,
      isNewArrival: false,
    },
    {
      title: "Never Let Me Go",
      slug: "never-let-me-go",
      description: "Kazuo Ishiguro's haunting deeply moving novel is a masterpiece of speculative fiction about memory, art, and what it means to be human.",
      isbn: "978-1400078775",
      publisher: "Knopf",
      authorSlug: "kazuo-ishiguro",
      categorySlug: "science-fiction",
      collectionSlug: "modern-classics",
      coverImage: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&q=80&w=800",
      publicationDate: "March 2005",
      pages: 288,
      rating: "4.50",
      reviewCount: 1850,
      isFeatured: false,
      isBestseller: false,
      isNewArrival: false,
    },
  ];

  for (const b of booksData) {
    const auth = createdAuthors.find((a) => a.slug === b.authorSlug);
    const cat = createdCategories.find((c) => c.slug === b.categorySlug);
    const col = createdCollections.find((c) => c.slug === b.collectionSlug);

    if (!auth || !cat) continue;

    const [insertedBook] = await db
      .insert(books)
      .values({
        title: b.title,
        slug: b.slug,
        description: b.description,
        isbn: b.isbn,
        publisher: b.publisher,
        authorId: auth.id,
        categoryId: cat.id,
        collectionId: col ? col.id : null,
        coverImage: b.coverImage,
        publicationDate: b.publicationDate,
        pages: b.pages,
        rating: b.rating,
        reviewCount: b.reviewCount,
        isFeatured: b.isFeatured,
        isBestseller: b.isBestseller,
        isNewArrival: b.isNewArrival,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedBook) {
      // Create Formats
      await db.insert(bookFormats).values([
        {
          bookId: insertedBook.id,
          format: "HARDCOVER",
          price: "34.99",
          stock: 40,
          weight: "1.2 lbs",
        },
        {
          bookId: insertedBook.id,
          format: "PAPERBACK",
          price: "19.99",
          stock: 75,
          weight: "0.8 lbs",
        },
        {
          bookId: insertedBook.id,
          format: "EBOOK",
          price: "9.99",
          stock: 9999,
          fileKey: `ebooks/${insertedBook.slug}.pdf`,
          fileSize: "4.2 MB",
          fileType: "PDF / EPUB",
        },
      ]);

      // Real chapter content for the digital edition (served only to owners)
      const chapters = chaptersForBook(insertedBook.slug, insertedBook.title);
      await db
        .insert(bookChapters)
        .values(
          chapters.map((c, i) => ({
            bookId: insertedBook.id,
            chapterNumber: i + 1,
            title: c.title,
            content: c.content,
            wordCount: countWords(c.content),
          }))
        )
        .onConflictDoNothing();
    }
  }

  // 6. Demo coupon for checkout testing
  await db
    .insert(coupons)
    .values({
      code: "VELORA10",
      discountPercent: 10,
      minOrderAmount: "20.00",
      usageLimit: 500,
    })
    .onConflictDoNothing();

  // Backfill: ensure every book with an EBOOK format has real chapter content,
  // even when the book row already existed from a previous seed run.
  const digitalBooks = await db
    .selectDistinct({ id: books.id, slug: books.slug, title: books.title })
    .from(books)
    .innerJoin(bookFormats, eq(bookFormats.bookId, books.id))
    .where(eq(bookFormats.format, "EBOOK"));

  for (const b of digitalBooks) {
    const [existing] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookChapters)
      .where(eq(bookChapters.bookId, b.id));
    if ((existing?.count ?? 0) > 0) continue;

    const chapters = chaptersForBook(b.slug, b.title);
    await db
      .insert(bookChapters)
      .values(
        chapters.map((c, i) => ({
          bookId: b.id,
          chapterNumber: i + 1,
          title: c.title,
          content: c.content,
          wordCount: countWords(c.content),
        }))
      )
      .onConflictDoNothing();
  }

  // ── Journal posts ──────────────────────────────────────────────
  const JOURNAL = [
    {
      title: "5 Books That Will Change How You Think",
      slug: "books-that-change-how-you-think",
      category: "Reading Lists",
      readTime: "6 min read",
      authorName: "The Velora Editors",
      coverImage: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1600",
      excerpt:
        "Some books add information; a rare few rearrange the furniture of the mind. These five did exactly that for our editors this season.",
      content: `There is a difference between a book that informs you and a book that reorganises you. The first leaves you with facts. The second leaves you unable to see an ordinary Tuesday the way you saw it last week.

We read with a pencil, and we argue with our margins. The five below earned their place the hard way — by being right about something difficult, and by refusing to make it comfortable.

Begin anywhere. Each stands alone, and each quietly points to the next. That is usually how a reading life actually assembles itself: not from a syllabus, but from one book's footnote becoming the next book's spine.`,
    },
    {
      title: "The Art of Building a Reading Habit",
      slug: "art-of-building-a-reading-habit",
      category: "Habits",
      readTime: "5 min read",
      authorName: "Eleanor Vance",
      coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1600",
      excerpt:
        "A reading habit is not built with streaks and guilt. It is built with a chair, a lamp, and a book you are genuinely unwilling to put down.",
      content: `Most reading advice fails because it treats reading as a discipline problem. It is not. It is a design problem.

Put a chair somewhere with good light. Keep one book — not a stack, one — within reach of it. Remove the thing that currently occupies that reach, usually a phone. You have now done more for your reading life than any tracking app will manage in a year.

The second rule is permission to abandon. A book you are finishing out of obligation is quietly teaching you that reading is a chore. Put it down. The right book does not require a streak to sustain it.`,
    },
    {
      title: "Our Favourite Books of the Year",
      slug: "our-favourite-books-of-the-year",
      category: "Annual List",
      readTime: "8 min read",
      authorName: "The Velora Editors",
      coverImage: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=1600",
      excerpt:
        "From a lighthouse keeper's impossible lamp to a generation ship that forgot its destination — the year's most memorable shelves.",
      content: `Every December we argue. The list below is what survived the argument.

We do not rank these. A ranking implies the books are competing, and they are not; they are doing entirely different work. What they share is that each one made at least one editor miss a train stop.

Return to this list next year. You will find, as we always do, that the books have stayed exactly the same and you have not.`,
    },
  ];

  for (const post of JOURNAL) {
    await db.insert(blogPosts).values(post).onConflictDoNothing();
  }

  // Give each collection a warm library image (mockup uses dark editorial art)
  const COLLECTION_IMAGES: Record<string, string> = {
    "midnight-collection":
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=1200",
    "modern-classics":
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1200",
    "curious-mind":
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=1200",
    "entrepreneurs-shelf":
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200",
  };
  for (const [slug, image] of Object.entries(COLLECTION_IMAGES)) {
    await db.update(collections).set({ image }).where(eq(collections.slug, slug));
  }

  // Replace cover images that no longer resolve upstream
  const COVER_FIXES: Record<string, string> = {
    "Fourth Wing":
      "https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?auto=format&fit=crop&q=80&w=800",
    "The Ballad of Never After":
      "https://images.unsplash.com/photo-1531072901881-d644216d4bf9?auto=format&fit=crop&q=80&w=800",
    "Lessons in Chemistry":
      "https://images.unsplash.com/photo-1535905557558-afc4877a26fc?auto=format&fit=crop&q=80&w=800",
  };
  for (const [title, coverImage] of Object.entries(COVER_FIXES)) {
    await db.update(books).set({ coverImage }).where(eq(books.title, title));
  }

  // Idempotent: ensure demo accounts are verified even on re-seed
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(inArray(users.email, ["admin@velorabooks.com", "customer@velorabooks.com"]));

  /**
   * Demo entitlement. Checkout now REQUIRES a configured Stripe account, so a
   * completed PAID order is seeded for the demo customer to make the library,
   * reader, and secure download flows explorable out of the box.
   */
  const [demoCustomer] = await db
    .select()
    .from(users)
    .where(eq(users.email, "customer@velorabooks.com"))
    .limit(1);

  if (demoCustomer) {
    const [existingDemo] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.idempotencyKey, "seed-demo-order"))
      .limit(1);

    if (!existingDemo) {
      const [ebookFormat] = await db
        .select({
          formatId: bookFormats.id,
          bookId: bookFormats.bookId,
          price: bookFormats.price,
          title: books.title,
        })
        .from(bookFormats)
        .innerJoin(books, eq(books.id, bookFormats.bookId))
        .where(eq(bookFormats.format, "EBOOK"))
        .limit(1);

      if (ebookFormat) {
        const [demoOrder] = await db
          .insert(orders)
          .values({
            userId: demoCustomer.id,
            status: "PAID",
            paymentStatus: "COMPLETED",
            subtotalAmount: ebookFormat.price,
            discountAmount: "0.00",
            shippingAmount: "0.00",
            totalAmount: ebookFormat.price,
            currency: "usd",
            idempotencyKey: "seed-demo-order",
          })
          .returning();

        await db.insert(orderItems).values({
          orderId: demoOrder.id,
          bookId: ebookFormat.bookId,
          formatId: ebookFormat.formatId,
          price: ebookFormat.price,
          quantity: 1,
          formatName: "EBOOK",
          bookTitle: ebookFormat.title,
          authorName: "Velora Editions",
          lineSubtotal: ebookFormat.price,
        });

        await db
          .insert(libraries)
          .values({
            userId: demoCustomer.id,
            bookId: ebookFormat.bookId,
            formatId: ebookFormat.formatId,
            purchaseOrderId: demoOrder.id,
            progressPercentage: 0,
            status: "READING",
          })
          .onConflictDoNothing();

        console.log(`Demo entitlement granted: "${ebookFormat.title}" (eBook) -> customer@velorabooks.com`);
      }
    }
  }

  const [{ count: chapterCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookChapters);

  console.log("Database seeded successfully!");
  console.log(`Seeded ${chapterCount} real eBook chapters.`);
  console.log("Demo coupon: VELORA10 (10% off orders over $20)");
}

// Execute when run directly: `npx dotenv -e .env -- npx tsx src/db/seed.ts`
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
