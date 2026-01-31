import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { seedHouseholdData } from '../services/seedService';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    householdName: z.string().min(1),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>();

    // Register new user + household
    fastify.post('/register', {
        schema: {
            body: registerSchema,
        },
    }, async (request, reply) => {
        const { email, password, name, householdName } = request.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return reply.status(400).send({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user + household in transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    name,
                },
            });

            const household = await tx.household.create({
                data: {
                    name: householdName,
                },
            });

            await tx.householdUser.create({
                data: {
                    userId: user.id,
                    householdId: household.id,
                    role: 'ADMIN',
                },
            });

            // Create default locations for this household
            await tx.location.createMany({
                data: [
                    { householdId: household.id, name: 'Frigorifero', isFreezer: false },
                    { householdId: household.id, name: 'Freezer', isFreezer: true },
                    { householdId: household.id, name: 'Dispensa', isFreezer: false },
                    { householdId: household.id, name: 'Cantina', isFreezer: false },
                ],
            });

            return { user, household };
        });

        // Seed household data (blocking - wait for completion before returning)
        // Only in non-production environments
        if (process.env.NODE_ENV !== 'production') {
            try {
                await seedHouseholdData(result.household.id);
            } catch (err) {
                // Log error but don't fail registration - demo data is optional
                console.error('⚠️ Household seed failed (registration continues):', err);
            }
        }

        return {
            message: 'Registration successful',
            user: { id: result.user.id, email: result.user.email, name: result.user.name },
            household: { id: result.household.id, name: result.household.name },
        };
    });

    // Login
    fastify.post('/login', {
        schema: {
            body: loginSchema,
        },
    }, async (request, reply) => {
        const { email, password } = request.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                households: {
                    include: {
                        household: true,
                    },
                },
            },
        });

        if (!user) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // For MVP, just return the first household
        const primaryHousehold = user.households[0]?.household;

        return {
            message: 'Login successful',
            user: { id: user.id, email: user.email, name: user.name },
            household: primaryHousehold ? { id: primaryHousehold.id, name: primaryHousehold.name } : null,
        };
    });
}
