CREATE TABLE "debug_api_logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "clientName" TEXT,
  "accountId" TEXT,
  "accountName" TEXT,
  "rawResponse" JSONB,
  "parsedValue" DOUBLE PRECISION,
  "httpStatus" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "debug_api_logs_pkey" PRIMARY KEY ("id")
);
