import { prisma } from '../../../shared/db/prismaClient';

const VOICE_SELECT = {
  id: true,
  tenantId: true,
  greeting: true,
  language: true,
  voiceId: true,
  systemPrompt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type VoiceConfigRow = {
  id: string;
  tenantId: string;
  greeting: string | null;
  language: string;
  voiceId: string | null;
  systemPrompt: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function findVoiceConfig(tenantId: string): Promise<VoiceConfigRow | null> {
  return prisma.voiceConfig.findFirst({ where: { tenantId }, select: VOICE_SELECT });
}

export type UpsertVoiceConfigInput = Partial<{
  greeting: string | null;
  language: string;
  voiceId: string | null;
  systemPrompt: string | null;
  isActive: boolean;
}>;

export async function upsertVoiceConfig(
  tenantId: string,
  input: UpsertVoiceConfigInput,
): Promise<VoiceConfigRow> {
  return prisma.voiceConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      greeting:     input.greeting     ?? null,
      language:     input.language     ?? 'en-US',
      voiceId:      input.voiceId      ?? null,
      systemPrompt: input.systemPrompt ?? null,
      isActive:     input.isActive     ?? true,
    },
    update: {
      ...(input.greeting     !== undefined && { greeting: input.greeting }),
      ...(input.language     !== undefined && { language: input.language }),
      ...(input.voiceId      !== undefined && { voiceId: input.voiceId }),
      ...(input.systemPrompt !== undefined && { systemPrompt: input.systemPrompt }),
      ...(input.isActive     !== undefined && { isActive: input.isActive }),
    },
    select: VOICE_SELECT,
  });
}
