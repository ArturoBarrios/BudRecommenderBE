import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function getUserWithPreferences(userId) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      strains: {
        include: {
          strain: {
            include: {
              strainTerpenes: {
                include: {
                  terpene: true,
                },
              },
              brand: true,
              strainStores: {
                include: {
                  store: true,
                },
              },
            },
          },
        },
      },
    },
  })
}
