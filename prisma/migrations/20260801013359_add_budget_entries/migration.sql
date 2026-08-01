-- CreateTable
CREATE TABLE "budget_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subReportId" TEXT,
    "channel" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_entries_clientId_year_month_idx" ON "budget_entries"("clientId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "budget_entries_clientId_subReportId_year_month_key" ON "budget_entries"("clientId", "subReportId", "year", "month");

-- AddForeignKey
ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_subReportId_fkey" FOREIGN KEY ("subReportId") REFERENCES "sub_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
