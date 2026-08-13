-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bookText" TEXT NOT NULL,
    "bookFilePath" TEXT NOT NULL,
    "bookFileUri" TEXT,
    "bookInteractionId" TEXT,
    "styleInteractionId" TEXT,
    "charactersInteractionId" TEXT,
    "chaptersInteractionId" TEXT,
    "style" TEXT,
    "characters" JSONB NOT NULL DEFAULT '[]',
    "chapters" JSONB NOT NULL DEFAULT '[]',
    "portraits" JSONB NOT NULL DEFAULT '[]',
    "illustrations" JSONB NOT NULL DEFAULT '[]',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "stepState" TEXT NOT NULL DEFAULT 'idle',
    "stuckAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
