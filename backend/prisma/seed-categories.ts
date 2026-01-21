import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed delle categorie ingredienti base per le ricette.
 * Eseguire DOPO il seed delle unità standard.
 * 
 * Uso: npx ts-node prisma/seed-categories.ts
 */
async function main() {
    console.log('🌱 Seeding ingredient categories...');

    // Trova le unità necessarie
    const grammi = await prisma.unit.findUnique({ where: { name: 'Grammi' } });
    const millilitri = await prisma.unit.findUnique({ where: { name: 'Millilitri' } });

    if (!grammi || !millilitri) {
        throw new Error('❌ Unità base (Grammi, Millilitri) non trovate. Esegui prima: npx prisma db seed');
    }

    // Trova tutti gli household esistenti
    const households = await prisma.household.findMany();

    if (households.length === 0) {
        console.log('⚠️ Nessun household trovato. Crea prima un utente.');
        return;
    }

    console.log(`📦 Trovati ${households.length} household`);

    // Categorie base
    const categories = [
        { name: 'Pasta secca', unitId: grammi.id },
        { name: 'Riso', unitId: grammi.id },
        { name: 'Verdure fresche', unitId: grammi.id },
        { name: 'Pomodori (conserva)', unitId: grammi.id },
        { name: 'Olio vegetale', unitId: millilitri.id },
        { name: 'Formaggio', unitId: grammi.id },
        { name: 'Carne', unitId: grammi.id },
    ];

    // Crea categorie per ogni household
    for (const household of households) {
        console.log(`\n🏠 Household: ${household.name} (${household.id})`);

        for (const cat of categories) {
            const existing = await prisma.ingredientCategory.findUnique({
                where: {
                    householdId_name: {
                        householdId: household.id,
                        name: cat.name
                    }
                }
            });

            if (existing) {
                console.log(`  ⏭️ ${cat.name} già esiste`);
            } else {
                await prisma.ingredientCategory.create({
                    data: {
                        householdId: household.id,
                        name: cat.name,
                        baseUnitId: cat.unitId
                    }
                });
                console.log(`  ✅ ${cat.name} creata`);
            }
        }
    }

    console.log('\n🎉 Seed categorie completato!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
