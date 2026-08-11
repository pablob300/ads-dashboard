-- Sub-relatórios passam a ser comuns a todos os canais.
-- Antes: um SubReport pertencia a um canal, então "Sub1" existia duas vezes
-- (uma no Google, outra no Meta) como registros sem relação entre si.
-- Agora: um SubReport por cliente, com as campanhas de cada canal penduradas
-- nele via sub_report_campaigns.

-- 1. Reset. Os budget_entries que apontam para estes sub-relatórios somem por
--    cascata (FK ON DELETE CASCADE). As linhas "Total (sem sub-relatório)",
--    que têm subReportId NULL, sobrevivem.
DELETE FROM "sub_reports";

-- 2. O sub-relatório deixa de ter canal e lista de campanhas, e ganha nome
--    único por cliente (era justamente a duplicação que confundia).
ALTER TABLE "sub_reports" DROP COLUMN "channel";
ALTER TABLE "sub_reports" DROP COLUMN "campaignIds";
CREATE UNIQUE INDEX "sub_reports_clientId_name_key" ON "sub_reports"("clientId", "name");

-- 3. Vínculo campanha ↔ sub-relatório, com o canal na campanha.
CREATE TABLE "sub_report_campaigns" (
    "id" TEXT NOT NULL,
    "subReportId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_report_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sub_report_campaigns_subReportId_channel_campaignId_key"
    ON "sub_report_campaigns"("subReportId", "channel", "campaignId");

CREATE INDEX "sub_report_campaigns_subReportId_idx"
    ON "sub_report_campaigns"("subReportId");

ALTER TABLE "sub_report_campaigns" ADD CONSTRAINT "sub_report_campaigns_subReportId_fkey"
    FOREIGN KEY ("subReportId") REFERENCES "sub_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. `channel` passa a fazer parte da chave única de budget_entries.
--    Antes "Sub1 Google" e "Sub1 Meta" eram subReportId diferentes, então a
--    chave sem canal bastava. Agora os dois compartilham o mesmo subReportId e
--    colidiriam no mesmo mês.
DROP INDEX "budget_entries_clientId_subReportId_year_month_key";
CREATE UNIQUE INDEX "budget_entries_clientId_subReportId_channel_year_month_key"
    ON "budget_entries"("clientId", "subReportId", "channel", "year", "month");
