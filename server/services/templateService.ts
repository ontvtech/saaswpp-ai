/**
 * SERVIÇO DE TEMPLATES DINÂMICOS - SaaSWPP AI
 * 
 * Templates com variáveis que são substituídas automaticamente
 * 
 * Variáveis disponíveis:
 * - {nome} - Nome do cliente
 * - {empresa} - Nome do negócio
 * - {data} - Data atual
 * - {hora} - Hora atual
 * - {produto} - Produto mencionado
 * - {valor} - Valor formatado
 * - {agendamento} - Data/hora do agendamento
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export interface MessageTemplate {
  id: string;
  merchantId: string;
  key: string;           // Identificador único (ex: 'welcome', 'follow_up')
  name: string;          // Nome amigável
  content: string;       // Template com variáveis
  category: 'welcome' | 'follow_up' | 'appointment' | 'sale' | 'support' | 'custom';
  variables: string[];   // Lista de variáveis usadas
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariables {
  nome?: string;
  empresa?: string;
  data?: string;
  hora?: string;
  produto?: string;
  valor?: string;
  agendamento?: string;
  telefone?: string;
  [key: string]: string | undefined;
}

// =============================================================================
// TEMPLATES PADRÃO DO SISTEMA
// =============================================================================

export const DEFAULT_TEMPLATES: Array<Omit<MessageTemplate, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'>> = [
  {
    key: 'welcome',
    name: 'Boas-vindas',
    content: 'Olá {nome}! 👋\n\nBem-vindo(a) à {empresa}! Como posso ajudar você hoje?\n\nVocê pode:\n• Agendar um horário\n• Ver nossos produtos\n• Fazer um orçamento',
    category: 'welcome',
    variables: ['nome', 'empresa'],
    isActive: true
  },
  {
    key: 'welcome_no_name',
    name: 'Boas-vindas (sem nome)',
    content: 'Olá! 👋\n\nBem-vindo(a) à {empresa}! Como posso ajudar você hoje?',
    category: 'welcome',
    variables: ['empresa'],
    isActive: true
  },
  {
    key: 'appointment_confirm',
    name: 'Confirmação de Agendamento',
    content: '✅ Agendamento confirmado!\n\n📅 Data: {agendamento}\n👤 Cliente: {nome}\n\nLembre-se de chegar 5 minutos antes. Precisando alterar, é só me avisar!',
    category: 'appointment',
    variables: ['agendamento', 'nome'],
    isActive: true
  },
  {
    key: 'appointment_reminder',
    name: 'Lembrete de Agendamento',
    content: '⏰ Lembrete!\n\n{nome}, você tem um agendamento amanhã:\n📅 {agendamento}\n\nConfirmado? Responda SIM ou NÃO.',
    category: 'appointment',
    variables: ['nome', 'agendamento'],
    isActive: true
  },
  {
    key: 'follow_up',
    name: 'Follow-up 24h',
    content: 'Oi {nome}! 👋\n\nTudo bem? Vi que não conseguimos finalizar seu atendimento ontem.\n\nAinda posso ajudar? É só me dizer o que precisa!',
    category: 'follow_up',
    variables: ['nome'],
    isActive: true
  },
  {
    key: 'follow_up_3days',
    name: 'Follow-up 3 dias',
    content: 'Oi {nome}! Tudo bem?\n\nLembra que você consultou sobre {produto}?\n\nAinda estou com uma condição especial pra você. Quer que eu te explique?',
    category: 'follow_up',
    variables: ['nome', 'produto'],
    isActive: true
  },
  {
    key: 'price_quote',
    name: 'Orçamento',
    content: '📋 Orçamento\n\nProduto: {produto}\nValor: {valor}\n\n✅ À vista: {valor} (5% off)\n💳 Parcelado: 3x sem juros\n\nPosso reservar pra você?',
    category: 'sale',
    variables: ['produto', 'valor'],
    isActive: true
  },
  {
    key: 'out_of_hours',
    name: 'Fora do Horário',
    content: 'Olá! 👋\n\nA {empresa} funciona de segunda a sexta, das 9h às 18h.\n\nDeixe sua mensagem que assim que abrirmos eu te respondo!\n\nSe for urgente, deixe seu telefone que ligamos pra você.',
    category: 'support',
    variables: ['empresa'],
    isActive: true
  },
  {
    key: 'human_handoff',
    name: 'Transferência para Humano',
    content: '✅ Entendido, {nome}!\n\nVou transferir você para um atendente humano. Aguarde um momento que já já ele te responde.\n\nEnquanto isso, pode ir adiantando sua dúvida!',
    category: 'support',
    variables: ['nome'],
    isActive: true
  },
  {
    key: 'thank_you',
    name: 'Agradecimento',
    content: 'Muito obrigado, {nome}! 🙏\n\nFoi um prazer te atender. Se precisar de mais alguma coisa, é só chamar!\n\nAté a próxima! 👋',
    category: 'custom',
    variables: ['nome'],
    isActive: true
  }
];

// =============================================================================
// FUNÇÕES DE PROCESSAMENTO
// =============================================================================

/**
 * Substitui variáveis no template pelos valores reais
 */
export function processTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  // Variáveis padrão
  const defaultVars: TemplateVariables = {
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    empresa: 'nossa empresa',
    nome: 'cliente'
  };

  // Merge com variáveis fornecidas
  const allVars = { ...defaultVars, ...variables };

  // Substituir cada variável
  for (const [key, value] of Object.entries(allVars)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  }

  return result;
}

/**
 * Extrai lista de variáveis de um template
 */
export function extractVariables(template: string): string[] {
  const regex = /\{(\w+)\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

// =============================================================================
// OPERAÇÕES NO BANCO
// =============================================================================

/**
 * Busca template por key
 */
export async function getTemplate(
  merchantId: string,
  key: string
): Promise<MessageTemplate | null> {
  // Buscar no banco do merchant
  const customTemplate = await prisma.messageTemplate.findFirst({
    where: { merchantId, key, isActive: true }
  });

  if (customTemplate) {
    return customTemplate as unknown as MessageTemplate;
  }

  // Retornar template padrão
  const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.key === key);
  if (defaultTemplate) {
    return {
      id: `default_${key}`,
      merchantId,
      ...defaultTemplate,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  return null;
}

/**
 * Lista todos os templates do merchant
 */
export async function listTemplates(merchantId: string): Promise<MessageTemplate[]> {
  // Buscar templates customizados
  const customTemplates = await prisma.messageTemplate.findMany({
    where: { merchantId }
  });

  // Criar mapa de templates customizados
  const customMap = new Map(
    customTemplates.map(t => [t.key, t])
  );

  // Merge com templates padrão (customizados sobrescrevem)
  const allTemplates: MessageTemplate[] = DEFAULT_TEMPLATES.map(defaultT => {
    const custom = customMap.get(defaultT.key);
    if (custom) {
      return custom as unknown as MessageTemplate;
    }
    return {
      id: `default_${defaultT.key}`,
      merchantId,
      ...defaultT,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  // Adicionar templates customizados que não existem nos padrão
  for (const custom of customTemplates) {
    if (!DEFAULT_TEMPLATES.find(t => t.key === custom.key)) {
      allTemplates.push(custom as unknown as MessageTemplate);
    }
  }

  return allTemplates;
}

/**
 * Cria ou atualiza template customizado
 */
export async function saveTemplate(
  merchantId: string,
  key: string,
  name: string,
  content: string,
  category: MessageTemplate['category'] = 'custom'
): Promise<MessageTemplate> {
  const variables = extractVariables(content);

  const template = await prisma.messageTemplate.upsert({
    where: {
      merchantId_key: { merchantId, key }
    },
    create: {
      merchantId,
      key,
      name,
      content,
      category,
      variables,
      isActive: true
    },
    update: {
      name,
      content,
      category,
      variables
    }
  });

  return template as unknown as MessageTemplate;
}

/**
 * Deleta template customizado (volta a usar o padrão se existir)
 */
export async function deleteTemplate(
  merchantId: string,
  key: string
): Promise<boolean> {
  try {
    await prisma.messageTemplate.deleteMany({
      where: { merchantId, key }
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Usa template e retorna mensagem processada
 */
export async function useTemplate(
  merchantId: string,
  key: string,
  variables: TemplateVariables
): Promise<string | null> {
  const template = await getTemplate(merchantId, key);
  if (!template) return null;

  return processTemplate(template.content, variables);
}

export default {
  processTemplate,
  extractVariables,
  getTemplate,
  listTemplates,
  saveTemplate,
  deleteTemplate,
  useTemplate,
  DEFAULT_TEMPLATES
};
