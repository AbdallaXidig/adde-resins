-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/webp',
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);
