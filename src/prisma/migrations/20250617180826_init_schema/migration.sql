-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thc" DOUBLE PRECISION NOT NULL,
    "weight" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "strainType" TEXT NOT NULL,

    CONSTRAINT "Strain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Terpene" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Terpene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrainTerpene" (
    "id" TEXT NOT NULL,
    "strainId" TEXT NOT NULL,
    "terpeneId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION,

    CONSTRAINT "StrainTerpene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StoreStrains" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StoreStrains_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserStores" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserStores_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserStrains" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserStrains_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Terpene_name_key" ON "Terpene"("name");

-- CreateIndex
CREATE INDEX "_StoreStrains_B_index" ON "_StoreStrains"("B");

-- CreateIndex
CREATE INDEX "_UserStores_B_index" ON "_UserStores"("B");

-- CreateIndex
CREATE INDEX "_UserStrains_B_index" ON "_UserStrains"("B");

-- AddForeignKey
ALTER TABLE "StrainTerpene" ADD CONSTRAINT "StrainTerpene_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "Strain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrainTerpene" ADD CONSTRAINT "StrainTerpene_terpeneId_fkey" FOREIGN KEY ("terpeneId") REFERENCES "Terpene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoreStrains" ADD CONSTRAINT "_StoreStrains_A_fkey" FOREIGN KEY ("A") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoreStrains" ADD CONSTRAINT "_StoreStrains_B_fkey" FOREIGN KEY ("B") REFERENCES "Strain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserStores" ADD CONSTRAINT "_UserStores_A_fkey" FOREIGN KEY ("A") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserStores" ADD CONSTRAINT "_UserStores_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserStrains" ADD CONSTRAINT "_UserStrains_A_fkey" FOREIGN KEY ("A") REFERENCES "Strain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserStrains" ADD CONSTRAINT "_UserStrains_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
