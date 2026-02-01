import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';

import { authRoutes } from './routes/auth';
import { productRoutes } from './routes/products';
import { stockRoutes } from './routes/stock';
import { queryRoutes } from './routes/queries';
import { shoppingRoutes } from './routes/shopping';
import { recipeRoutes } from './routes/recipes';
import { suggestionRoutes } from './routes/suggestions';
import { categoryRoutes } from './routes/categories';
import { onboardingRoutes } from './routes/onboarding';
import { gamificationRoutes } from './routes/gamification';
import { seedGlobalData } from './services/seedService';

const app = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

// Setup Zod for validation
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Seed global data on startup (units)
if (process.env.NODE_ENV !== 'test') {
    await seedGlobalData();
}

// CORS for frontend
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
});


// Health check
app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
app.register(authRoutes, { prefix: '/api/auth' });
app.register(productRoutes, { prefix: '/api/products' });
app.register(stockRoutes, { prefix: '/api/stock' });
app.register(queryRoutes, { prefix: '/api/queries' });
app.register(shoppingRoutes, { prefix: '/api/shopping' });
app.register(recipeRoutes, { prefix: '/api/recipes' });
app.register(suggestionRoutes, { prefix: '/api/suggestions' });
app.register(categoryRoutes, { prefix: '/api/categories' });
app.register(onboardingRoutes, { prefix: '/api/onboarding' });
app.register(gamificationRoutes, { prefix: '/api/gamification' });

// Start server
const start = async () => {
    try {
        await app.listen({ port: 3001, host: '0.0.0.0' });
        console.log('🚀 Server running at http://localhost:3001');
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
