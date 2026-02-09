import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@recheese.com" },
    update: {},
    create: {
      name: "Admin Recheese",
      email: "admin@recheese.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Created admin user:", admin.email);

  // Create operator user
  const operatorPassword = await bcrypt.hash("operator123", 10);

  const operator = await prisma.user.upsert({
    where: { email: "operator@recheese.com" },
    update: {},
    create: {
      name: "Operator Recheese",
      email: "operator@recheese.com",
      password: operatorPassword,
      role: "OPERATOR",
    },
  });

  console.log("✅ Created operator user:", operator.email);

  // Create viewer user
  const viewerPassword = await bcrypt.hash("viewer123", 10);

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@recheese.com" },
    update: {},
    create: {
      name: "Viewer Recheese",
      email: "viewer@recheese.com",
      password: viewerPassword,
      role: "VIEWER",
    },
  });

  console.log("✅ Created viewer user:", viewer.email);

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Test accounts:");
  console.log("   Admin:    admin@recheese.com / admin123");
  console.log("   Operator: operator@recheese.com / operator123");
  console.log("   Viewer:   viewer@recheese.com / viewer123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
