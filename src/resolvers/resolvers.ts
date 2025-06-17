import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const resolvers = {
    Query: {
    getStrains: async () => {
      return await prisma.strain.findMany({
        include: {
          stores: true,
          strainTerpenes: {
            include: {
              terpene: true,
            },
          },
        },
        orderBy: {
          
        },
      });
    },
  },
  Mutation: {
    createStore: async (_: any, args: { name: string }) => {
      return await prisma.store.create({
        data: { name: args.name },
      });
    },
    signup: async (_: any, args: { email: string; password: string }) => {
      const existing = await prisma.user.findUnique({ where: { email: args.email } });
      if (existing) {
        throw new Error('Email already in use.');
      }

      const hashedPassword = await bcrypt.hash(args.password, 10);

      return await prisma.user.create({
        data: {
          email: args.email,
          password: hashedPassword,
        },
      });
    },
    login: async (_: any, args: { email: string; password: string }) => {
      const user = await prisma.user.findUnique({ where: { email: args.email } });
      if (!user) {
        throw new Error('Invalid email or password.');
      }

      const isValid = await bcrypt.compare(args.password, user.password);
      if (!isValid) {
        throw new Error('Invalid email or password.');
      }

      return user;
    },

    createStrain: async (
      _: any,
      args: {
        name: string;
        url: string;
        thc: number;
        weight: string;
        price: string;
        strainType: string;
        storeIds: string[];
        terpeneNames: string[];
        terpenePercentages: number[];
      }
    ) => {
      const strain = await prisma.strain.create({
        data: {
          name: args.name,
          url: args.url,
          thc: args.thc,
          weight: args.weight,
          price: args.price,
          strainType: args.strainType,
          stores: {
            connect: args.storeIds.map(id => ({ id })),
          },
        },
      });

      for (let i = 0; i < args.terpeneNames.length; i++) {
        const name = args.terpeneNames[i];
        const percentage = args.terpenePercentages[i];

        let terpene = await prisma.terpene.findUnique({ where: { name } });

        if (!terpene) {
          terpene = await prisma.terpene.create({
            data: {
              name,
              description: '', // Optional placeholder
            },
          });
        }

        await prisma.strainTerpene.create({
          data: {
            strainId: strain.id,
            terpeneId: terpene.id,
            percentage,
          },
        });
      }

      return await prisma.strain.findUnique({
        where: { id: strain.id },
        include: {
          stores: true,
          strainTerpenes: {
            include: {
              terpene: true,
            },
          },
        },
      });
    },
  },
};
