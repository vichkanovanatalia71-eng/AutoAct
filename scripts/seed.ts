import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

async function seed() {
  const prisma = new PrismaClient();
  const templates = JSON.parse(
    readFileSync(join(__dirname, "../workflows/templates.json"), "utf-8")
  );

  console.log(`Seeding ${templates.length} templates...`);

  // Clear existing templates
  await prisma.workflowTemplate.deleteMany();

  // Insert in batches of 100
  for (let i = 0; i < templates.length; i += 100) {
    const batch = templates.slice(i, i + 100);
    await prisma.workflowTemplate.createMany({
      data: batch.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        definition: { nodes: t.nodes, trigger: t.trigger },
        requiredCredentials: t.required_credentials,
        triggerType: t.trigger.type,
      })),
    });
    console.log(`  Inserted ${Math.min(i + 100, templates.length)} / ${templates.length}`);
  }

  console.log("Done!");
  await prisma.$disconnect();
}

seed().catch(console.error);
