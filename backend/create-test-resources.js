import "dotenv/config";
import prisma from "./src/config/prisma.js";

const providers = [
  {
    email: "aarav.provider01@example.com",
    resources: [
      ["O Positive Blood", "BLOOD", 10, "Pune", "O-positive blood units; test data"],
      ["A Positive Blood", "BLOOD", 8, "Pune", "A-positive blood units; test data"],
      ["B Positive Blood", "BLOOD", 6, "Pune", "B-positive blood units; test data"],
      ["AB Positive Blood", "BLOOD", 4, "Pune", "AB-positive blood units; test data"],
      ["O Negative Blood", "BLOOD", 3, "Pune", "O-negative blood units; test data"],
    ],
  },
  {
    email: "priya.provider02@example.com",
    resources: [
      ["General Ward Beds", "HOSPITAL_BED", 12, "Pune", "General ward capacity; test data"],
      ["ICU Beds", "HOSPITAL_BED", 4, "Pune", "ICU capacity; test data"],
      ["Emergency Beds", "HOSPITAL_BED", 5, "Pune", "Emergency bed capacity; test data"],
      ["Pediatric Beds", "HOSPITAL_BED", 6, "Pune", "Pediatric bed capacity; test data"],
      ["Oxygen-Supported Beds", "HOSPITAL_BED", 3, "Pune", "Oxygen-supported bed capacity; test data"],
    ],
  },
  {
    email: "rahul.provider03@example.com",
    resources: [
      ["Paracetamol Tablets", "MEDICINE", 100, "Mumbai", "Tablet stock; test data"],
      ["Oral Rehydration Salts", "MEDICINE", 50, "Mumbai", "ORS packets; test data"],
      ["First Aid Kits", "MEDICINE", 25, "Mumbai", "First aid supplies; test data"],
      ["Antiseptic Solution", "MEDICINE", 30, "Mumbai", "Antiseptic stock; test data"],
      ["Disposable Bandages", "MEDICINE", 100, "Mumbai", "Bandage stock; test data"],
    ],
  },
  {
    email: "sneha.provider04@example.com",
    resources: [
      ["Basic Life Support Ambulance 1", "AMBULANCE", 1, "Nashik", "BLS vehicle; test data"],
      ["Basic Life Support Ambulance 2", "AMBULANCE", 1, "Nashik", "BLS vehicle; test data"],
      ["Advanced Life Support Ambulance 1", "AMBULANCE", 1, "Nashik", "ALS vehicle; test data"],
      ["Patient Transport Ambulance 1", "AMBULANCE", 1, "Nashik", "Patient transport; test data"],
      ["Patient Transport Ambulance 2", "AMBULANCE", 1, "Nashik", "Patient transport; test data"],
    ],
  },
  {
    email: "aditya.provider05@example.com",
    resources: [
      ["Family Shelter Spaces", "SHELTER", 20, "Nagpur", "Family accommodation capacity; test data"],
      ["Women's Shelter Spaces", "SHELTER", 10, "Nagpur", "Shelter capacity; test data"],
      ["Temporary Accommodation", "SHELTER", 15, "Nagpur", "Temporary accommodation; test data"],
      ["Emergency Sleeping Spaces", "SHELTER", 25, "Nagpur", "Sleeping capacity; test data"],
      ["Accessible Shelter Spaces", "SHELTER", 5, "Nagpur", "Accessible accommodation; test data"],
    ],
  },
  {
    email: "neha.provider06@example.com",
    resources: [
      ["Ready-to-Eat Meal Packs", "FOOD", 100, "Bengaluru", "Prepared meal packs; test data"],
      ["Dry Ration Kits", "FOOD", 50, "Bengaluru", "Dry ration kits; test data"],
      ["Emergency Food Kits", "FOOD", 60, "Bengaluru", "Emergency food kits; test data"],
      ["Baby Food Packs", "FOOD", 20, "Bengaluru", "Baby food packs; test data"],
      ["Community Food Parcels", "FOOD", 75, "Bengaluru", "Food parcels; test data"],
    ],
  },
  {
    email: "rohan.provider07@example.com",
    resources: [
      ["Drinking Water Bottles", "WATER", 200, "Hyderabad", "Bottled water; test data"],
      ["Water Canisters", "WATER", 40, "Hyderabad", "Water canisters; test data"],
      ["Emergency Water Kits", "WATER", 50, "Hyderabad", "Emergency water kits; test data"],
      ["Community Water Containers", "WATER", 25, "Hyderabad", "Water containers; test data"],
      ["Packaged Drinking Water", "WATER", 150, "Hyderabad", "Packaged water; test data"],
    ],
  },
  {
    email: "ananya.provider08@example.com",
    resources: [
      ["Emergency Treatment Beds", "HOSPITAL_BED", 4, "Chennai", "Emergency bed capacity; test data"],
      ["General Ward Beds", "HOSPITAL_BED", 15, "Chennai", "General ward capacity; test data"],
      ["Oxygen-Supported Beds", "HOSPITAL_BED", 5, "Chennai", "Oxygen-supported bed capacity; test data"],
      ["Observation Beds", "HOSPITAL_BED", 6, "Chennai", "Observation bed capacity; test data"],
      ["Recovery Beds", "HOSPITAL_BED", 8, "Chennai", "Recovery bed capacity; test data"],
    ],
  },
  {
    email: "karan.provider09@example.com",
    resources: [
      ["Emergency Meal Packs", "FOOD", 80, "Delhi", "Emergency meal packs; test data"],
      ["Dry Food Kits", "FOOD", 40, "Delhi", "Dry food kits; test data"],
      ["Family Shelter Spaces", "SHELTER", 15, "Delhi", "Family shelter capacity; test data"],
      ["Temporary Sleeping Spaces", "SHELTER", 20, "Delhi", "Temporary sleeping capacity; test data"],
      ["Drinking Water Kits", "WATER", 50, "Delhi", "Water kits; test data"],
    ],
  },
  {
    email: "isha.provider10@example.com",
    resources: [
      ["First Aid Kits", "MEDICINE", 30, "Thane", "First aid kits; test data"],
      ["Bandage Packs", "MEDICINE", 100, "Thane", "Bandage packs; test data"],
      ["Antiseptic Supplies", "MEDICINE", 40, "Thane", "Antiseptic supplies; test data"],
      ["ORS Packets", "MEDICINE", 60, "Thane", "ORS packets; test data"],
      ["Emergency Medical Kits", "MEDICINE", 20, "Thane", "Medical kits; test data"],
    ],
  },
];

async function main() {
  const emails = providers.map((p) => p.email);

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: {
      email: true,
      role: true,
      provider: {
        select: {
          id: true,
          city: true,
          verified: true,
          verificationStatus: true,
        },
      },
    },
  });

  const byEmail = new Map(users.map((u) => [u.email, u]));
  const missing = emails.filter((email) => !byEmail.has(email));

  if (missing.length) {
    throw new Error(
      `No accounts found for: ${missing.join(", ")}. Nothing was inserted.`
    );
  }

  const invalid = providers.filter(({ email }) => {
    const user = byEmail.get(email);
    return (
      user.role !== "PROVIDER" ||
      !user.provider ||
      !user.provider.verified ||
      user.provider.verificationStatus !== "APPROVED"
    );
  });

  if (invalid.length) {
    throw new Error(
      `These accounts are not approved providers: ${invalid.map(p => p.email).join(", ")}. Nothing was inserted.`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    let skipped = 0;

    for (const entry of providers) {
      const user = byEmail.get(entry.email);
      const providerId = user.provider.id;

      for (const [name, category, quantity, city, description] of entry.resources) {
        const existing = await tx.resource.findFirst({
          where: { providerId, name },
          select: { id: true },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await tx.resource.create({
          data: {
            name,
            category,
            quantity,
            available: false,
            city,
            address: null,
            description: `[TEST DATA — NOT VERIFIED] ${description}`,
            providerId,
          },
        });

        created++;
      }
    }

    return { created, skipped };
  });

  console.log("Resource seeding finished.");
  console.log(`Created: ${result.created}`);
  console.log(`Skipped existing records: ${result.skipped}`);
  console.log("Availability: false for every inserted test resource.");
}

main()
  .catch((error) => {
    console.error("Stopped safely:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
