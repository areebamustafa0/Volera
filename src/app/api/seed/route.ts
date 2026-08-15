import { NextResponse } from "next/server";
import { seedDatabase } from "@/db/seed";

export async function GET(request: Request) {
  try {
    // Optional secret check or open for initial test
    await seedDatabase();
    return NextResponse.json({ success: true, message: "Database seeded successfully!" });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
