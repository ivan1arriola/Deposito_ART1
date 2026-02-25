/*
  Warnings:

  - The primary key for the `Personal` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Personal` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Personal_cedulaIdentidad_key";

-- AlterTable
ALTER TABLE "Personal" DROP CONSTRAINT "Personal_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Personal_pkey" PRIMARY KEY ("cedulaIdentidad");
