import dotenv from 'dotenv';
dotenv.config(); 

import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { readFileSync } from 'fs';
import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import strainsRoutes from './routes/strains.js';
import { resolvers } from './resolvers/resolvers.js';
import path from 'path';
import userAuthRouter from '../src/routes/userAuth.js';
import session from 'express-session';

const app = express();
const PORT = 4000;



// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // adjust if Nuxt is hosted elsewhere
  credentials: true
}));
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'your-super-secret-with-32-chars',
    resave: true, // <--- force session save on every response
    saveUninitialized: true, // <--- create session even if nothing set yet
    cookie: {
      httpOnly: true,
      secure: false, // true in production w/ HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

app.use(express.json());
app.use('/strains', strainsRoutes);
app.use('/auth', userAuthRouter);

// Load schema and create server
const typeDefs = gql(readFileSync(new URL('./schema.graphql', import.meta.url), 'utf8'));


const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

await server.start();

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req, res }) => ({ req, res }),
}));

app.listen(PORT, () => {
  console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
  console.log(`📦 Strains routes ready`);
});
