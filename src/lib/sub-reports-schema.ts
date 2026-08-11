import { z } from "zod/v4";
import { CHANNEL_KEYS, isKnownChannel } from "./channels";
import { totalCampaignCount } from "./sub-reports";

// Módulo separado de ./sub-reports porque este importa zod, e ./sub-reports é
// consumido por componentes client — não vale arrastar zod para o bundle.

/**
 * Mapa canal → ids de campanha.
 *
 * Usa `z.record(z.string(), ...)` + refine em vez de `z.record(z.enum(CHANNEL_KEYS), ...)`:
 * no Zod v4 um record com chave enum é **exaustivo** e exigiria todos os canais em
 * todo request, quebrando tanto o cadastro de um sub-relatório só de Google quanto
 * o PATCH que remove todas as campanhas de um canal.
 */
export const campaignsByChannelSchema = z
  .record(z.string(), z.array(z.string()))
  .refine((v) => Object.keys(v).every(isKnownChannel), {
    message: `Canal inválido. Esperado um de: ${CHANNEL_KEYS.join(", ")}.`,
  })
  .refine((v) => totalCampaignCount(v) > 0, {
    message: "Selecione ao menos uma campanha.",
  });

export const createSubReportSchema = z.object({
  name: z.string().min(1),
  campaignsByChannel: campaignsByChannelSchema,
});

export const updateSubReportSchema = z.object({
  name: z.string().min(1).optional(),
  campaignsByChannel: campaignsByChannelSchema.optional(),
});
