import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";

const citizenPassword = "Citizen@123";
const providerPassword = "Provider@123";

const providerOrganizations = [
    "Pune Emergency Medical Center",
    "Sahyadri Care Hospital",
    "Pune Blood Support Center",
    "Maharashtra Emergency Care",
    "Aarogya Relief Hospital",
    "Pune Lifeline Medical Center",
    "Sahayata Emergency Hospital",
    "Pune Community Care",
    "Jeevan Emergency Center",
    "Pune Disaster Response Center"
];

const providerTypes = [
    "Hospital",
    "Hospital",
    "Blood Bank",
    "Hospital",
    "NGO",
    "Hospital",
    "Hospital",
    "NGO",
    "Hospital",
    "Emergency Center"
];

const streets = [
    "FC Road",
    "Baner Road",
    "Aundh Road",
    "Kothrud",
    "Shivajinagar",
    "Hadapsar",
    "Wakad",
    "Viman Nagar",
    "Katraj",
    "Pimpri"
];

const resourceCatalog = {
    BLOOD: [
        "O+ Blood",
        "O- Blood",
        "A+ Blood",
        "A- Blood",
        "B+ Blood",
        "B- Blood",
        "AB+ Blood",
        "AB- Blood",
        "Whole Blood",
        "Platelets"
    ],

    HOSPITAL_BED: [
        "General Bed",
        "ICU Bed",
        "Emergency Bed",
        "Pediatric Bed",
        "Isolation Bed",
        "Ventilator Bed"
    ],

    MEDICINE: [
        "Paracetamol",
        "Antibiotics",
        "ORS",
        "Insulin",
        "Pain Relief Medicine",
        "Emergency Medicine Kit"
    ],

    AMBULANCE: [
        "Basic Ambulance",
        "Advanced Life Support Ambulance",
        "Patient Transport Ambulance",
        "Neonatal Ambulance"
    ],

    SHELTER: [
        "Emergency Shelter",
        "Temporary Shelter",
        "Family Shelter",
        "Women and Children Shelter"
    ],

    FOOD: [
        "Ready-to-Eat Meals",
        "Food Packets",
        "Dry Ration Kit",
        "Emergency Meal Kit"
    ],

    WATER: [
        "Drinking Water Bottles",
        "Water Can",
        "Emergency Water Kit",
        "Water Tanker"
    ]
};

const categories = [
    "BLOOD",
    "HOSPITAL_BED",
    "MEDICINE",
    "AMBULANCE",
    "SHELTER",
    "FOOD",
    "WATER"
];

const quantities = [5, 10, 25, 20];

const seedDemoData = async () => {
    console.log("==========================================");
    console.log("      SAHAYAK DEMO DATABASE RESET");
    console.log("==========================================");

    console.log("Clearing existing data...");

    /*
     * Delete all application data and reset
     * auto-increment IDs back to 1.
     */
    await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE
            "EmergencyRequest",
            "Resource",
            "Provider",
            "User"
        RESTART IDENTITY CASCADE;
    `);

    console.log("Existing data cleared.");
    console.log("");

    /*
     |--------------------------------------------------------------------------
     | PASSWORD HASHES
     |--------------------------------------------------------------------------
     */

    const citizenHash = await bcrypt.hash(
        citizenPassword,
        12
    );

    const providerHash = await bcrypt.hash(
        providerPassword,
        12
    );

    const adminPassword =
        process.env.ADMIN_PASSWORD || "Snehal@1234";

    const adminEmail =
        process.env.ADMIN_EMAIL || "admin@sahayak.local";

    const adminHash = await bcrypt.hash(
        adminPassword,
        12
    );

    /*
     |--------------------------------------------------------------------------
     | CITIZENS
     |--------------------------------------------------------------------------
     */

    console.log("Creating 10 citizens...");

    const citizens = [];

    for (let index = 0; index < 10; index += 1) {
        const citizen = await prisma.user.create({
            data: {
                name: `Citizen ${String(index + 1).padStart(2, "0")}`,
                email: `citizen${String(index + 1).padStart(2, "0")}@sahayak.com`,
                password: citizenHash,
                role: "CITIZEN",
                city: "Pune"
            }
        });

        citizens.push(citizen);
    }

    /*
     |--------------------------------------------------------------------------
     | PROVIDERS
     |--------------------------------------------------------------------------
     */

    console.log("Creating 10 providers...");

    const providers = [];

    for (let index = 0; index < 10; index += 1) {
        const providerUser = await prisma.user.create({
            data: {
                name: `Provider ${String(index + 1).padStart(2, "0")}`,
                email: `provider${String(index + 1).padStart(2, "0")}@sahayak.com`,
                password: providerHash,
                role: "PROVIDER",
                city: "Pune"
            }
        });

        const provider = await prisma.provider.create({
            data: {
                organization:
                    providerOrganizations[index],
                type: providerTypes[index],
                city: "Pune",
                address:
                    `${100 + index} ${streets[index]}, Pune, Maharashtra`,
                phone:
                    `98765432${String(index).padStart(2, "0")}`,
                verified: true,
                userId: providerUser.id
            }
        });

        providers.push({
            provider,
            user: providerUser
        });
    }

    /*
     |--------------------------------------------------------------------------
     | RESOURCES
     |--------------------------------------------------------------------------
     */

    console.log("Creating resources...");

    let resourceNumber = 0;

    for (
        let providerIndex = 0;
        providerIndex < providers.length;
        providerIndex += 1
    ) {
        const provider = providers[providerIndex].provider;

        for (
            let categoryIndex = 0;
            categoryIndex < categories.length;
            categoryIndex += 1
        ) {
            const category = categories[categoryIndex];

            const options =
                resourceCatalog[category];

            const resourceName =
                options[
                    providerIndex % options.length
                ];

            const quantity =
                quantities[
                    (providerIndex + categoryIndex) %
                        quantities.length
                ];

            resourceNumber += 1;

            /*
             * Keep most resources available but intentionally
             * make every 10th resource unavailable so that
             * the frontend can be tested with both states.
             */
            const available =
                resourceNumber % 10 !== 0;

            await prisma.resource.create({
                data: {
                    name: resourceName,
                    category,
                    quantity,
                    available,
                    city: "Pune",
                    address: provider.address,
                    description:
                        `${resourceName} available at ${provider.organization} for emergency assistance.`,
                    providerId: provider.id
                }
            });
        }
    }

    /*
     |--------------------------------------------------------------------------
     | ADMIN
     |--------------------------------------------------------------------------
     */

    console.log("Creating admin...");

    const admin = await prisma.user.create({
        data: {
            name:
                process.env.ADMIN_NAME ||
                "Sahayak Admin",
            email: adminEmail,
            password: adminHash,
            role: "ADMIN",
            city: null
        }
    });

    /*
     |--------------------------------------------------------------------------
     | VERIFY COUNTS
     |--------------------------------------------------------------------------
     */

    const userCount = await prisma.user.count();
    const providerCount = await prisma.provider.count();
    const resourceCount = await prisma.resource.count();
    const requestCount =
        await prisma.emergencyRequest.count();

    console.log("");
    console.log("==========================================");
    console.log("       DEMO DATA CREATED SUCCESSFULLY");
    console.log("==========================================");
    console.log(`Users:       ${userCount}`);
    console.log(`Providers:   ${providerCount}`);
    console.log(`Resources:   ${resourceCount}`);
    console.log(`Requests:    ${requestCount}`);
    console.log("");

    console.log("Citizen login:");
    console.log("Email:    citizen01@sahayak.com");
    console.log("Password: Citizen@123");
    console.log("");

    console.log("Provider login:");
    console.log("Email:    provider01@sahayak.com");
    console.log("Password: Provider@123");
    console.log("");

    console.log("Admin login:");
    console.log(`Email:    ${admin.email}`);
    console.log(`Password: ${adminPassword}`);
    console.log("");

    console.log("ID layout:");
    console.log("Citizen Users:  1 - 10");
    console.log("Provider Users: 11 - 20");
    console.log("Admin User:     21");
    console.log("Providers:      1 - 10");
    console.log("Resources:      1 - 70");
    console.log("Requests:       0");
    console.log("");
    console.log("==========================================");
};

seedDemoData()
    .catch((error) => {
        console.error("");
        console.error("DEMO SEED FAILED");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });