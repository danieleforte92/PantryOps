import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default units
    const units = await Promise.all([
        prisma.unit.upsert({
            where: { name: 'Pezzi' },
            update: {},
            create: { name: 'Pezzi', abbreviation: 'pz' },
        }),
        prisma.unit.upsert({
            where: { name: 'Grammi' },
            update: {},
            create: { name: 'Grammi', abbreviation: 'g' },
        }),
        prisma.unit.upsert({
            where: { name: 'Chilogrammi' },
            update: {},
            create: { name: 'Chilogrammi', abbreviation: 'kg' },
        }),
        prisma.unit.upsert({
            where: { name: 'Millilitri' },
            update: {},
            create: { name: 'Millilitri', abbreviation: 'ml' },
        }),
        prisma.unit.upsert({
            where: { name: 'Litri' },
            update: {},
            create: { name: 'Litri', abbreviation: 'l' },
        }),
        prisma.unit.upsert({
            where: { name: 'Bottiglie' },
            update: {},
            create: { name: 'Bottiglie', abbreviation: 'bot' },
        }),
        prisma.unit.upsert({
            where: { name: 'Confezioni' },
            update: {},
            create: { name: 'Confezioni', abbreviation: 'conf' },
        }),
    ]);

    console.log(`✅ Created ${units.length} units`);

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
