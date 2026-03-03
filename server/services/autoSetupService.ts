/**
 * SERVIÇO DE TREINAMENTO AUTOMÁTICO - SaaSWPP AI
 * 
 * O "Botão Mágico" que configura tudo automaticamente:
 * 1. Carrega grupos do WhatsApp
 * 2. Estuda mensagens dos grupos selecionados
 * 3. Gera base de conhecimento
 * 4. Configura prompts da IA
 * 5. Cria triggers automáticos
 * 6. Configura mensagens de boas-vindas
 */

import { PrismaClient } from '@prisma/client';
import { FEATURES, FEATURES_BY_MODULE, type FeatureKey, type AIModule } from '../config/features';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

interface WhatsAppGroup {
  id: string;
  name: string;
  participants: number;
  picture?: string;
}

interface StudyResult {
  success: boolean;
  messagesAnalyzed: number;
  knowledgeItems: string[];
  businessName: string;
  businessType: string;
  services: string[];
  pricing: { service: string; price: string }[];
  schedule: { open: string; close: string; days: string[] };
  tone: string;
  confidence: number;
}

interface AutoSetupProgress {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message: string;
  progress: number; // 0-100
}

// =============================================================================
// SERVIÇO PRINCIPAL
// =============================================================================

export class AutoSetupService {
  
  private evolutionUrl: string;
  private evolutionKey: string;
  
  constructor() {
    this.evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    this.evolutionKey = process.env.EVOLUTION_API_KEY || '';
  }
  
  /**
   * CARREGA TODOS OS GRUPOS DO WHATSAPP
   */
  async loadGroups(instanceName: string): Promise<WhatsAppGroup[]> {
    console.log(`[AUTO-SETUP] Carregando grupos da instância ${instanceName}`);
    
    try {
      const response = await fetch(`${this.evolutionUrl}/group/fetchAllGroups/${instanceName}`, {
        headers: {
          'apikey': this.evolutionKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar grupos: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Mapear resposta para formato padrão
      const groups: WhatsAppGroup[] = (data || []).map((g: any) => ({
        id: g.id || g.jid,
        name: g.subject || g.name || 'Grupo sem nome',
        participants: g.participants?.length || g.size || 0,
        picture: g.picture || undefined
      }));
      
      console.log(`[AUTO-SETUP] ${groups.length} grupos encontrados`);
      return groups;
      
    } catch (error: any) {
      console.error('[AUTO-SETUP] Erro ao carregar grupos:', error);
      throw error;
    }
  }
  
  /**
   * BUSCA MENSAGENS DE UM GRUPO
   */
  async getGroupMessages(instanceName: string, groupId: string, limit: number = 500): Promise<any[]> {
    console.log(`[AUTO-SETUP] Buscando mensagens do grupo ${groupId}`);
    
    try {
      const response = await fetch(
        `${this.evolutionUrl}/chat/findMessages/${instanceName}?where[key_remote_jid]=${groupId}&limit=${limit}`,
        {
          headers: {
            'apikey': this.evolutionKey
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar mensagens: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data || [];
      
    } catch (error: any) {
      console.error('[AUTO-SETUP] Erro ao buscar mensagens:', error);
      return [];
    }
  }
  
  /**
   * ESTUDA AS MENSAGENS E EXTRAI CONHECIMENTO
   */
  async studyMessages(messages: any[]): Promise<StudyResult> {
    console.log(`[AUTO-SETUP] Estudando ${messages.length} mensagens`);
    
    // Filtrar apenas mensagens de texto relevantes
    const textMessages = messages
      .filter(m => m.message?.conversation || m.message?.extendedTextMessage?.text)
      .map(m => m.message?.conversation || m.message?.extendedTextMessage?.text)
      .filter((text: string) => text && text.length > 10)
      .slice(0, 200); // Limitar a 200 mensagens para análise
    
    if (textMessages.length === 0) {
      return {
        success: false,
        messagesAnalyzed: 0,
        knowledgeItems: [],
        businessName: '',
        businessType: '',
        services: [],
        pricing: [],
        schedule: { open: '', close: '', days: [] },
        tone: 'professional',
        confidence: 0
      };
    }
    
    // Prompt para a IA extrair conhecimento
    const analysisPrompt = `
Analise as seguintes mensagens de um grupo de WhatsApp de uma empresa e extraia informações estruturadas.

MENSAGENS:
${textMessages.join('\n---\n')}

Extraia e retorne UM JSON válido com a seguinte estrutura:
{
  "businessName": "Nome da empresa (se mencionado)",
  "businessType": "Tipo de negócio (ex: clínica, oficina, restaurante, loja)",
  "services": ["lista de serviços ou produtos oferecidos"],
  "pricing": [{"service": "nome", "price": "valor"}],
  "schedule": {"open": "horário abertura", "close": "horário fechamento", "days": ["dias de funcionamento"]},
  "location": "endereço ou localização (se mencionado)",
  "contact": "informações de contato (se mencionado)",
  "paymentMethods": ["métodos de pagamento aceitos"],
  "tone": "tom de comunicação (professional, casual, friendly)",
  "keywords": ["palavras-chave frequentes"],
  "faqs": [{"question": "pergunta comum", "answer": "resposta típica"}],
  "policies": {"policy_name": "descrição da política"}
}

Retorne APENAS o JSON, sem explicações.
`;

    try {
      // Chamar IA para análise
      const aiResponse = await this.callAI(analysisPrompt);
      
      // Parse do JSON
      const cleaned = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleaned);
      
      // Construir items de conhecimento
      const knowledgeItems: string[] = [];
      
      if (result.businessName) knowledgeItems.push(`Nome da empresa: ${result.businessName}`);
      if (result.businessType) knowledgeItems.push(`Tipo de negócio: ${result.businessType}`);
      if (result.services?.length) knowledgeItems.push(`Serviços/Produtos: ${result.services.join(', ')}`);
      if (result.location) knowledgeItems.push(`Localização: ${result.location}`);
      if (result.contact) knowledgeItems.push(`Contato: ${result.contact}`);
      if (result.paymentMethods?.length) knowledgeItems.push(`Formas de pagamento: ${result.paymentMethods.join(', ')}`);
      
      // Adicionar preços
      if (result.pricing?.length) {
        result.pricing.forEach((p: any) => {
          knowledgeItems.push(`Preço de ${p.service}: ${p.price}`);
        });
      }
      
      // Adicionar horário
      if (result.schedule?.open) {
        const days = result.schedule.days?.join(', ') || 'Segunda a Sexta';
        knowledgeItems.push(`Horário de funcionamento: ${days}, das ${result.schedule.open} às ${result.schedule.close}`);
      }
      
      // Adicionar políticas
      if (result.policies) {
        Object.entries(result.policies).forEach(([name, desc]) => {
          knowledgeItems.push(`${name}: ${desc}`);
        });
      }
      
      // Adicionar FAQs
      if (result.faqs?.length) {
        result.faqs.forEach((faq: any) => {
          knowledgeItems.push(`Pergunta frequente: "${faq.question}" - Resposta: ${faq.answer}`);
        });
      }
      
      return {
        success: true,
        messagesAnalyzed: textMessages.length,
        knowledgeItems,
        businessName: result.businessName || 'Empresa',
        businessType: result.businessType || 'comércio',
        services: result.services || [],
        pricing: result.pricing || [],
        schedule: result.schedule || { open: '', close: '', days: [] },
        tone: result.tone || 'professional',
        confidence: Math.min(0.9, textMessages.length / 100)
      };
      
    } catch (error: any) {
      console.error('[AUTO-SETUP] Erro ao estudar mensagens:', error);
      
      // Retornar resultado básico em caso de erro
      return {
        success: true,
        messagesAnalyzed: textMessages.length,
        knowledgeItems: ['Empresa cadastrada no sistema SaaSWPP'],
        businessName: 'Empresa',
        businessType: 'comércio',
        services: [],
        pricing: [],
        schedule: { open: '09:00', close: '18:00', days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'] },
        tone: 'professional',
        confidence: 0.3
      };
    }
  }
  
  /**
   * EXECUTA O SETUP AUTOMÁTICO COMPLETO
   */
  async runAutoSetup(merchantId: string, selectedGroupIds: string[]): Promise<AutoSetupProgress[]> {
    const progress: AutoSetupProgress[] = [];
    
    // Buscar merchant e instância
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });
    
    if (!merchant || !merchant.evolutionInstance) {
      throw new Error('Merchant ou instância não encontrada');
    }
    
    // Criar registro de AutoSetup
    let autoSetup = await prisma.autoSetup.findUnique({
      where: { merchantId }
    });
    
    if (!autoSetup) {
      autoSetup = await prisma.autoSetup.create({
        data: {
          merchantId,
          status: 'running',
          startedAt: new Date(),
          selectedGroups: selectedGroupIds.map(id => ({ groupId: id }))
        }
      });
    } else {
      autoSetup = await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: {
          status: 'running',
          startedAt: new Date(),
          errorMessage: null
        }
      });
    }
    
    try {
      // ============================================================
      // ETAPA 1: CARREGAR GRUPOS
      // ============================================================
      progress.push({ step: 'groups_load', status: 'running', message: 'Carregando grupos...', progress: 10 });
      
      const allGroups = await this.loadGroups(merchant.evolutionInstance);
      const selectedGroups = allGroups.filter(g => selectedGroupIds.includes(g.id));
      
      await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: { stepGroupsLoaded: true }
      });
      
      progress[progress.length - 1].status = 'completed';
      progress[progress.length - 1].progress = 15;
      
      // ============================================================
      // ETAPA 2: ESTUDAR MENSAGENS DOS GRUPOS
      // ============================================================
      progress.push({ step: 'groups_study', status: 'running', message: 'Estudando mensagens dos grupos...', progress: 20 });
      
      let totalMessages = 0;
      const allKnowledge: string[] = [];
      let businessName = merchant.name;
      let businessType = 'comércio';
      let tone = 'professional';
      
      for (const group of selectedGroups) {
        const messages = await this.getGroupMessages(merchant.evolutionInstance, group.id);
        const study = await this.studyMessages(messages);
        
        totalMessages += study.messagesAnalyzed;
        allKnowledge.push(...study.knowledgeItems);
        
        if (study.businessName && study.businessName !== 'Empresa') {
          businessName = study.businessName;
        }
        if (study.businessType) businessType = study.businessType;
        if (study.tone) tone = study.tone;
        
        // Salvar estudo do grupo
        await prisma.studyGroup.upsert({
          where: {
            merchantId_groupId: {
              merchantId,
              groupId: group.id
            }
          },
          update: {
            groupName: group.name,
            status: 'completed',
            studiedAt: new Date(),
            messageCount: study.messagesAnalyzed,
            generatedKnowledge: JSON.stringify(study.knowledgeItems),
            confidence: study.confidence
          },
          create: {
            merchantId,
            groupId: group.id,
            groupName: group.name,
            status: 'completed',
            studiedAt: new Date(),
            messageCount: study.messagesAnalyzed,
            generatedKnowledge: JSON.stringify(study.knowledgeItems),
            confidence: study.confidence
          }
        });
      }
      
      await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: { 
          stepGroupsStudied: true,
          totalMessagesAnalyzed: totalMessages
        }
      });
      
      progress[progress.length - 1].status = 'completed';
      progress[progress.length - 1].progress = 40;
      
      // ============================================================
      // ETAPA 3: CRIAR BASE DE CONHECIMENTO
      // ============================================================
      progress.push({ step: 'knowledge', status: 'running', message: 'Criando base de conhecimento...', progress: 50 });
      
      // Remover duplicatas
      const uniqueKnowledge = [...new Set(allKnowledge)];
      
      // Criar itens na base de conhecimento
      for (const item of uniqueKnowledge) {
        await prisma.knowledgeBase.create({
          data: {
            merchantId,
            title: item.substring(0, 50) + (item.length > 50 ? '...' : ''),
            content: item,
            source: 'auto_study'
          }
        });
      }
      
      await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: { 
          stepKnowledgeCreated: true,
          totalKnowledgeItems: uniqueKnowledge.length
        }
      });
      
      progress[progress.length - 1].status = 'completed';
      progress[progress.length - 1].progress = 60;
      
      // ============================================================
      // ETAPA 4: CONFIGURAR IA
      // ============================================================
      progress.push({ step: 'ai_config', status: 'running', message: 'Configurando IA...', progress: 70 });
      
      // Gerar prompt do sistema automaticamente
      const systemPrompt = this.generateSystemPrompt(businessName, businessType, uniqueKnowledge, tone);
      
      await prisma.merchant.update({
        where: { id: merchantId },
        data: {
          name: businessName,
          aiConfig: {
            name: `${businessName} Assistant`,
            tone: tone,
            prompt: systemPrompt,
            businessType: businessType
          }
        }
      });
      
      await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: { stepAIConfigured: true }
      });
      
      progress[progress.length - 1].status = 'completed';
      progress[progress.length - 1].progress = 80;
      
      // ============================================================
      // ETAPA 5: CRIAR TRIGGERS AUTOMÁTICOS
      // ============================================================
      progress.push({ step: 'triggers', status: 'running', message: 'Criando automações...', progress: 85 });
      
      // Trigger de boas-vindas
      await prisma.automationTrigger.create({
        data: {
          merchantId,
          name: 'Boas-vindas Automático',
          description: 'Enviado quando cliente inicia conversa',
          isActive: true,
          triggerType: 'keyword',
          triggerConfig: { keywords: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'] },
          actionType: 'send_message',
          actionConfig: { 
            message: `Olá! Bem-vindo(a) à ${businessName}! 🎉\n\nComo posso ajudar você hoje?` 
          }
        }
      });
      
      // Trigger de reativação (clientes inativos)
      await prisma.automationTrigger.create({
        data: {
          merchantId,
          name: 'Reativação de Clientes',
          description: 'Mensagem para clientes inativos há 30 dias',
          isActive: true,
          triggerType: 'inactivity',
          triggerConfig: { days: 30 },
          actionType: 'send_message',
          actionConfig: { 
            message: `Oi! Faz um tempo que não apareço por aqui. Sentimos sua falta na ${businessName}! 🤗\n\nTemos novidades esperando por você. Quer saber mais?` 
          }
        }
      });
      
      await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: { stepTriggersCreated: true }
      });
      
      progress[progress.length - 1].status = 'completed';
      progress[progress.length - 1].progress = 90;
      
      // ============================================================
      // ETAPA 6: CRIAR TEMPLATES
      // ============================================================
      progress.push({ step: 'templates', status: 'running', message: 'Criando templates...', progress: 92 });
      
      // Template de horário de funcionamento
      await prisma.messageTemplate.create({
        data: {
          merchantId,
          key: 'business_hours',
          name: 'Horário de Funcionamento',
          content: `📅 Nosso horário de funcionamento:\n\nSegunda a Sexta: 09:00 às 18:00\nSábado: 09:00 às 13:00\nDomingo: Fechado\n\nPosso ajudar com mais alguma coisa?`,
          category: 'info',
          isActive: true
        }
      });
      
      // Template de preços
      await prisma.messageTemplate.create({
        data: {
          merchantId,
          key: 'price_list',
          name: 'Lista de Preços',
          content: `📋 Nossos serviços:\n\nConsulte nossa lista completa de serviços e preços diretamente conosco!\n\nQuer que eu te passe mais detalhes?`,
          category: 'sale',
          isActive: true
        }
      });
      
      await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: { stepPromptsGenerated: true }
      });
      
      progress[progress.length - 1].status = 'completed';
      progress[progress.length - 1].progress = 95;
      
      // ============================================================
      // FINALIZAR
      // ============================================================
      await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          confidenceScore: Math.min(0.95, uniqueKnowledge.length / 20)
        }
      });
      
      progress.push({ step: 'complete', status: 'completed', message: 'Setup concluído com sucesso!', progress: 100 });
      
      return progress;
      
    } catch (error: any) {
      console.error('[AUTO-SETUP] Erro:', error);
      
      await prisma.autoSetup.update({
        where: { id: autoSetup.id },
        data: {
          status: 'error',
          errorMessage: error.message
        }
      });
      
      progress.push({ step: 'error', status: 'error', message: error.message, progress: 0 });
      
      return progress;
    }
  }
  
  /**
   * GERA PROMPT DO SISTEMA AUTOMATICAMENTE
   */
  private generateSystemPrompt(
    businessName: string, 
    businessType: string, 
    knowledge: string[], 
    tone: string
  ): string {
    const toneInstructions = {
      professional: 'Seja sempre educado, profissional e objetivo nas respostas.',
      casual: 'Seja descontraído, use emojis ocasionalmente, mas mantenha o respeito.',
      friendly: 'Seja caloroso e acolhedor, como um amigo ajudando outro amigo.'
    };
    
    return `Você é a assistente virtual da ${businessName}, um(a) ${businessType}.

# SUA PERSONALIDADE
- ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}
- Sempre seja prestativa e tente resolver os problemas do cliente.
- Se não souber algo, diga que vai verificar e pedir um momento.

# SOBRE A EMPRESA
${knowledge.join('\n')}

# REGRAS IMPORTANTES
1. NUNCA invente preços ou informações que não estão na base de conhecimento.
2. Se o cliente quiser agendar, pergunte qual serviço e horário preferido.
3. Se o cliente estiver insatisfeito, peça desculpas e ofereça uma solução.
4. Se não conseguir resolver algo, ofereça o contato humano.
5. Use tags quando necessário:
   - [SCHEDULE_REQUEST] - quando cliente quer agendar
   - [HUMAN_HANDOFF] - quando precisa de atendimento humano
   - [PIX_SIGNAL] - quando cliente quer pagar via PIX

# EXEMPLOS DE RESPOSTAS
Cliente: "Qual o horário de vocês?"
Você: "Nosso horário de funcionamento é Segunda a Sexta das 9h às 18h e Sábado das 9h às 13h. Posso ajudar com mais alguma coisa?"

Cliente: "Quero marcar um horário"
Você: "Claro! Qual serviço você gostaria de agendar e qual horário prefere? [SCHEDULE_REQUEST]"
`;
  }
  
  /**
   * CHAMA A IA (GLM/GEMINI)
   */
  private async callAI(prompt: string): Promise<string> {
    // Usar o serviço de IA existente
    const { aiOrchestrator } = await import('./aiOrchestrator');
    
    const response = await aiOrchestrator.generateResponse({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'Você é um assistente especializado em análise de conversas de empresas. Retorne apenas JSON válido.',
      merchantId: 'system'
    });
    
    return response.content;
  }
  
  /**
   * BUSCA STATUS DO AUTO SETUP
   */
  async getAutoSetupStatus(merchantId: string) {
    return prisma.autoSetup.findUnique({
      where: { merchantId }
    });
  }
  
  /**
   * LISTA GRUPOS DE ESTUDO
   */
  async listStudyGroups(merchantId: string) {
    return prisma.studyGroup.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// =============================================================================
// SERVIÇO DE GERENCIAMENTO DE FEATURES
// =============================================================================

export class FeatureManagerService {
  
  /**
   * BUSCA CONFIGURAÇÃO DE FEATURES DE UM PLANO
   */
  async getPlanFeatures(planId: string) {
    const config = await prisma.planFeatureConfig.findUnique({
      where: { planId }
    });
    
    if (!config) {
      // Criar configuração padrão baseada no plano
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (!plan) return null;
      
      return this.createDefaultPlanConfig(planId, plan.name);
    }
    
    return config;
  }
  
  /**
   * CRIA CONFIGURAÇÃO PADRÃO PARA UM PLANO
   */
  async createDefaultPlanConfig(planId: string, planName: string) {
    const defaultConfigs: Record<string, { features: FeatureKey[], modules: AIModule[], limits: any }> = {
      'START': {
        features: ['INTERACTIVE_MESSAGES', 'DYNAMIC_TEMPLATES', 'HEATMAP_HOURS'],
        modules: ['ESSENTIAL'],
        limits: { maxMessages: 5000, maxTokens: 50000, maxInstances: 1, maxStudyGroups: 1 }
      },
      'PRO': {
        features: ['INTERACTIVE_MESSAGES', 'DYNAMIC_TEMPLATES', 'HEATMAP_HOURS', 'MEDIA_SENDING', 'ROI_DASHBOARD', 'CALENDAR_SYNC'],
        modules: ['ESSENTIAL', 'SALES_PRO'],
        limits: { maxMessages: 20000, maxTokens: 150000, maxInstances: 1, maxStudyGroups: 2 }
      },
      'ENTERPRISE': {
        features: FEATURES_BY_MODULE.ESSENTIAL.concat(FEATURES_BY_MODULE.SALES_PRO).concat(['SENTIMENT_ANALYSIS', 'AUTO_TRIGGERS', 'DRIP_CAMPAIGNS']) as FeatureKey[],
        modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE'],
        limits: { maxMessages: 50000, maxTokens: 300000, maxInstances: 2, maxStudyGroups: 3 }
      },
      'ELITE': {
        features: FEATURES_BY_MODULE.ESSENTIAL.concat(FEATURES_BY_MODULE.SALES_PRO).concat(FEATURES_BY_MODULE.PREDICTIVE).concat(['LONG_TERM_MEMORY', 'FLOW_BUILDER', 'WEBHOOKS_ZAPIER']) as FeatureKey[],
        modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE'],
        limits: { maxMessages: 150000, maxTokens: 1000000, maxInstances: 5, maxStudyGroups: 5 }
      },
      'NINJA': {
        features: Object.keys(FEATURES) as FeatureKey[],
        modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'],
        limits: { maxMessages: -1, maxTokens: -1, maxInstances: -1, maxStudyGroups: 10 }
      }
    };
    
    const defaultConfig = defaultConfigs[planName.toUpperCase()] || defaultConfigs['START'];
    
    // Criar objeto de features
    const featuresObj: Record<string, boolean> = {};
    Object.keys(FEATURES).forEach(key => {
      featuresObj[key] = defaultConfig.features.includes(key as FeatureKey);
    });
    
    // Criar objeto de módulos
    const modulesObj: Record<string, boolean> = {};
    ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'].forEach(m => {
      modulesObj[m] = defaultConfig.modules.includes(m as AIModule);
    });
    
    return prisma.planFeatureConfig.create({
      data: {
        planId,
        features: featuresObj,
        modules: modulesObj,
        ...defaultConfig.limits
      }
    });
  }
  
  /**
   * ATUALIZA FEATURE DE UM PLANO
   */
  async updatePlanFeature(planId: string, featureKey: FeatureKey, enabled: boolean) {
    const config = await this.getPlanFeatures(planId);
    if (!config) throw new Error('Configuração não encontrada');
    
    const features = config.features as Record<string, boolean> || {};
    features[featureKey] = enabled;
    
    return prisma.planFeatureConfig.update({
      where: { planId },
      data: { features }
    });
  }
  
  /**
   * ATUALIZA MÓDULO DE UM PLANO
   */
  async updatePlanModule(planId: string, module: AIModule, enabled: boolean) {
    const config = await this.getPlanFeatures(planId);
    if (!config) throw new Error('Configuração não encontrada');
    
    const modules = config.modules as Record<string, boolean> || {};
    modules[module] = enabled;
    
    return prisma.planFeatureConfig.update({
      where: { planId },
      data: { modules }
    });
  }
  
  /**
   * ATUALIZA LIMITES DE UM PLANO
   */
  async updatePlanLimits(planId: string, limits: {
    maxMessages?: number;
    maxTokens?: number;
    maxInstances?: number;
    maxStudyGroups?: number;
  }) {
    return prisma.planFeatureConfig.update({
      where: { planId },
      data: limits
    });
  }
  
  /**
   * LISTA TODAS AS FEATURES DISPONÍVEIS
   */
  getAllFeatures() {
    return FEATURES;
  }
  
  /**
   * LISTA FEATURES POR MÓDULO
   */
  getFeaturesByModule() {
    return FEATURES_BY_MODULE;
  }
  
  /**
   * VERIFICA SE UM MERCHANT TEM ACESSO A UMA FEATURE
   */
  async hasFeatureAccess(merchantId: string, featureKey: FeatureKey): Promise<boolean> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { plan: true }
    });
    
    if (!merchant || !merchant.plan) return false;
    
    const config = await this.getPlanFeatures(merchant.plan.id);
    if (!config) return false;
    
    const features = config.features as Record<string, boolean>;
    return features[featureKey] === true;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const autoSetupService = new AutoSetupService();
export const featureManagerService = new FeatureManagerService();

export default autoSetupService;
