import { z } from 'zod';
import { prisma } from '../../../shared/db/prismaClient';
import { findVoiceConfig, upsertVoiceConfig, VoiceConfigRow } from './voice-config.repository';

export const UpdateVoiceConfigSchema = z.object({
  greeting:     z.string().max(500).nullable().optional(),
  language:     z.string().max(20).optional(),
  voiceId:      z.string().max(100).nullable().optional(),
  systemPrompt: z.string().max(8000).nullable().optional(),
  isActive:     z.boolean().optional(),
});

export type VoiceConfigDto = {
  id: string | null;
  greeting: string | null;
  language: string;
  voiceId: string | null;
  systemPrompt: string | null;
  isActive: boolean;
  updatedAt: string | null;
  tenantApiKey: string | null;
};

function toDto(row: VoiceConfigRow, tenantApiKey: string | null): VoiceConfigDto {
  return {
    id:           row.id,
    greeting:     row.greeting,
    language:     row.language,
    voiceId:      row.voiceId,
    systemPrompt: row.systemPrompt,
    isActive:     row.isActive,
    updatedAt:    row.updatedAt.toISOString(),
    tenantApiKey,
  };
}

export async function getVoiceConfig(tenantId: string) {
  const [row, tenant] = await Promise.all([
    findVoiceConfig(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { apiKey: true } }),
  ]);
  const tenantApiKey = tenant?.apiKey ?? null;

  if (!row) {
    return {
      id: null, greeting: null, language: 'en-US', voiceId: null,
      systemPrompt: null, isActive: false, updatedAt: null, tenantApiKey,
    };
  }
  return toDto(row, tenantApiKey);
}

export async function saveVoiceConfig(
  tenantId: string,
  input: z.infer<typeof UpdateVoiceConfigSchema>,
) {
  const [row, tenant] = await Promise.all([
    upsertVoiceConfig(tenantId, input),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { apiKey: true } }),
  ]);
  return toDto(row, tenant?.apiKey ?? null);
}
