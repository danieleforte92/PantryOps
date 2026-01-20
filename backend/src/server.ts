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

const app = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

// Setup Zod for validation
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);


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
