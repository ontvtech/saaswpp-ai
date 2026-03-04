/**
 * SERVIÇO DE NFS-e (Nota Fiscal de Serviço Eletrônica) - SaaSWPP AI
 * 
 * Integração com provedores de NFS-e:
 * - Focus NFe (https://focusnfe.com.br)
 * - NFE.io (https://nfe.io)
 * - Webmania (https://webmaniabr.com)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export type NFSProvider = 'FOCUS_NFE' | 'NFE_IO' | 'WEBMANIA';

export interface ISServiceConfig {
  cnpj: string;
  municipalRegistration: string;
  serviceCode: string;
  serviceDescription: string;
  aliquotIss: number;
}

export interface ITakerInfo {
  type: 'cpf' | 'cnpj' | 'estrangeiro';
  document?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

export interface IInvoiceData {
  ownerType: 'reseller' | 'merchant';
  ownerId: string;
  value: number;
  taker?: ITakerInfo;
  serviceCode?: string;
  serviceDescription?: string;
  competenceDate?: Date;
  paymentId?: string;
  subscriptionId?: string;
  paymentMethod?: string;
  deductions?: number;
}

export interface IInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  verificationCode?: string;
  invoiceUrl?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  issuedAt?: Date;
  error?: string;
}

// =============================================================================
// CONFIGURAÇÕES DOS PROVEDORES
// =============================================================================

const PROVIDER_CONFIGS = {
  FOCUS_NFE: {
    baseUrl: 'https://api.focusnfe.com.br/v2',
    homologationUrl: 'https://homologacao.focusnfe.com.br/v2'
  },
  NFE_IO: {
    baseUrl: 'https://api.nfe.io/v1',
    homologationUrl: 'https://sandbox.api.nfe.io/v1'
  },
  WEBMANIA: {
    baseUrl: 'https://api.webmaniabr.com/nfse',
    homologationUrl: 'https://sandbox.webmaniabr.com/nfse'
  }
};

// =============================================================================
// SERVIÇO PRINCIPAL
// =============================================================================

export class NFServicoService {
  
  /**
   * Emite uma NFS-e automaticamente após pagamento confirmado
   */
  async emitOnPaymentConfirmed(data: IInvoiceData): Promise<IInvoiceResponse> {
    console.log(`[NFS-e] Iniciando emissão para ${data.ownerType} ${data.ownerId}`);
    
    try {
      // 1. Buscar configuração fiscal
      const config = await prisma.fiscalConfig.findUnique({
        where: {
          ownerType_ownerId: {
            ownerType: data.ownerType,
            ownerId: data.ownerId
          }
        }
      });
      
      if (!config) {
        console.log(`[NFS-e] Configuração fiscal não encontrada para ${data.ownerType} ${data.ownerId}`);
        return { success: false, error: 'Configuração fiscal não encontrada' };
      }
      
      // 2. Verificar se está habilitado
      if (!config.nfseEnabled) {
        console.log(`[NFS-e] NFS-e desabilitado para ${data.ownerType} ${data.ownerId}`);
        return { success: false, error: 'NFS-e desabilitado' };
      }
      
      // 3. Verificar se deve emitir automaticamente
      if (!config.autoIssue) {
        console.log(`[NFS-e] Emissão automática desabilitada para ${data.ownerType} ${data.ownerId}`);
        return { success: false, error: 'Emissão automática desabilitada' };
      }
      
      // 4. Criar registro de nota pendente
      const invoice = await prisma.invoice.create({
        data: {
          ownerType: data.ownerType,
          ownerId: data.ownerId,
          status: 'pending',
          serviceValue: data.value,
          totalValue: data.value,
          netValue: data.value,
          serviceCode: data.serviceCode || config.serviceCode || undefined,
          serviceDescription: data.serviceDescription || config.serviceDescription || undefined,
          competenceDate: data.competenceDate || new Date(),
          paymentId: data.paymentId,
          subscriptionId: data.subscriptionId,
          paymentAmount: data.value,
          paymentMethod: data.paymentMethod,
          takerType: data.taker?.type || 'cpf',
          takerDocument: data.taker?.document || config.defaultTakerCnpj || undefined,
          takerName: data.taker?.name || config.defaultTakerName || undefined,
          takerEmail: data.taker?.email || config.defaultTakerEmail || undefined,
          takerPhone: data.taker?.phone || undefined,
          takerAddress: data.taker?.address ? 
            `${data.taker.address.street || ''}, ${data.taker.address.number || ''}`.trim() : undefined,
          takerCity: data.taker?.address?.city || undefined,
          takerState: data.taker?.address?.state || undefined,
          deductionValue: data.deductions || 0,
          provider: config.provider
        }
      });
      
      // 5. Log de criação
      await this.logAction(invoice.id, 'created', `Nota criada para pagamento ${data.paymentId}`);
      
      // 6. Emitir via provedor
      const result = await this.emitWithProvider(invoice.id, config);
      
      return result;
      
    } catch (error: any) {
      console.error('[NFS-e] Erro ao emitir:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Emite NFS-e usando o provedor configurado
   */
  async emitWithProvider(invoiceId: string, config: any): Promise<IInvoiceResponse> {
    console.log(`[NFS-e] Emitindo nota ${invoiceId} via ${config.provider}`);
    
    // Atualizar status para processando
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'processing' }
    });
    
    try {
      let result: IInvoiceResponse;
      
      switch (config.provider) {
        case 'FOCUS_NFE':
          result = await this.emitWithFocusNfe(invoiceId, config);
          break;
        case 'NFE_IO':
          result = await this.emitWithNfeIo(invoiceId, config);
          break;
        case 'WEBMANIA':
          result = await this.emitWithWebmania(invoiceId, config);
          break;
        default:
          result = { success: false, error: `Provedor ${config.provider} não suportado` };
      }
      
      // Atualizar status final
      if (result.success) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'issued',
            invoiceNumber: result.invoiceNumber,
            verificationCode: result.verificationCode,
            invoiceUrl: result.invoiceUrl,
            pdfUrl: result.pdfUrl,
            xmlUrl: result.xmlUrl,
            issuedAt: result.issuedAt || new Date(),
            providerId: result.invoiceId
          }
        });
        
        await this.logAction(invoiceId, 'issued', `Nota emitida: ${result.invoiceNumber}`);
      } else {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'error',
            errorMessage: result.error
          }
        });
        
        await this.logAction(invoiceId, 'error', result.error);
      }
      
      return result;
      
    } catch (error: any) {
      console.error(`[NFS-e] Erro ao emitir nota ${invoiceId}:`, error);
      
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'error',
          errorMessage: error.message
        }
      });
      
      await this.logAction(invoiceId, 'error', error.message);
      
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Emite NFS-e via Focus NFe
   * Documentação: https://focusnfe.com.br/doc/nfse/
   */
  private async emitWithFocusNfe(invoiceId: string, config: any): Promise<IInvoiceResponse> {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { success: false, error: 'Nota não encontrada' };
    
    const providerConfig = PROVIDER_CONFIGS.FOCUS_NFE;
    const baseUrl = config.apiEnvironment === 'production' 
      ? providerConfig.baseUrl 
      : providerConfig.homologationUrl;
    
    // Montar payload para Focus NFe
    const payload = {
      // Prestador (quem emite)
      prestador: {
        cnpj: config.cnpj,
        inscricao_municipal: config.municipalRegistration
      },
      // Tomador (cliente)
      tomador: invoice.takerDocument ? {
        cnpj: invoice.takerType === 'cnpj' ? invoice.takerDocument : undefined,
        cpf: invoice.takerType === 'cpf' ? invoice.takerDocument : undefined,
        razao_social: invoice.takerName,
        email: invoice.takerEmail,
        endereco: invoice.takerAddress ? {
          logradouro: invoice.takerAddress,
          municipio: invoice.takerCity,
          uf: invoice.takerState
        } : undefined
      } : undefined,
      // Serviço
      servico: {
        aliquota: config.aliquotIss / 100, // Focus espera decimal
        discriminacao: invoice.serviceDescription || 'Serviços de automação de WhatsApp via IA',
        iss_retido: false,
        item_lista_servico: invoice.serviceCode || '1.05', // LC 116
        valor_iss: (invoice.serviceValue * config.aliquotIss) / 100,
        valor_iss_retido: 0,
        valor_deducoes: invoice.deductionValue,
        valor_liquido: invoice.netValue,
        valor_servicos: invoice.serviceValue
      },
      // Valores
      valor_total: invoice.totalValue,
      // Data de competência
      data_competencia: invoice.competenceDate?.toISOString().split('T')[0]
    };
    
    try {
      const response = await fetch(`${baseUrl}/nfse?ref=${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(config.apiToken + ':').toString('base64')}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { 
          success: false, 
          error: data.mensagem || data.erros?.join(', ') || 'Erro desconhecido' 
        };
      }
      
      // Salvar resposta completa
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { providerResponse: data }
      });
      
      return {
        success: true,
        invoiceId: data.id?.toString(),
        invoiceNumber: data.numero?.toString(),
        verificationCode: data.codigo_verificacao,
        invoiceUrl: data.link,
        pdfUrl: data.link_pdf,
        xmlUrl: data.link_xml,
        issuedAt: data.data_emissao ? new Date(data.data_emissao) : new Date()
      };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Emite NFS-e via NFE.io
   * Documentação: https://nfe.io/docs/
   */
  private async emitWithNfeIo(invoiceId: string, config: any): Promise<IInvoiceResponse> {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { success: false, error: 'Nota não encontrada' };
    
    const providerConfig = PROVIDER_CONFIGS.NFE_IO;
    const baseUrl = config.apiEnvironment === 'production' 
      ? providerConfig.baseUrl 
      : providerConfig.homologationUrl;
    
    // Montar payload para NFE.io
    const payload = {
      // Identificação
      idExterno: invoiceId,
      // Prestador
      empresaId: config.apiToken, // Company ID na NFE.io
      // Tomador
      tomador: invoice.takerDocument ? {
        tipoPessoa: invoice.takerType === 'cnpj' ? 'JURIDICA' : 'FISICA',
        documento: invoice.takerDocument,
        nome: invoice.takerName,
        email: invoice.takerEmail
      } : undefined,
      // Serviço
      servico: {
        codigo: invoice.serviceCode || '1.05',
        descricao: invoice.serviceDescription || 'Serviços de automação de WhatsApp via IA',
        aliquota: config.aliquotIss
      },
      // Valores
      valorServicos: invoice.serviceValue,
      valorDeducoes: invoice.deductionValue,
      valorTotal: invoice.totalValue
    };
    
    try {
      const response = await fetch(`${baseUrl}/nfse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`,
          'X-Api-Key': config.apiSecret || ''
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || data.error?.message || 'Erro desconhecido' 
        };
      }
      
      // Salvar resposta completa
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { providerResponse: data }
      });
      
      return {
        success: true,
        invoiceId: data.id,
        invoiceNumber: data.numero,
        verificationCode: data.codigoVerificacao,
        invoiceUrl: data.url,
        pdfUrl: data.urlPdf,
        xmlUrl: data.urlXml,
        issuedAt: data.dataEmissao ? new Date(data.dataEmissao) : new Date()
      };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Emite NFS-e via Webmania
   * Documentação: https://webmaniabr.com/docs/rest-api-nfse/
   */
  private async emitWithWebmania(invoiceId: string, config: any): Promise<IInvoiceResponse> {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { success: false, error: 'Nota não encontrada' };
    
    const providerConfig = PROVIDER_CONFIGS.WEBMANIA;
    const baseUrl = config.apiEnvironment === 'production' 
      ? providerConfig.baseUrl 
      : providerConfig.homologationUrl;
    
    // Montar payload para Webmania
    const payload = {
      // Identificação
      ID: invoiceId,
      // Prestador
      prestador: {
        cnpj: config.cnpj,
        inscricao_municipal: config.municipalRegistration
      },
      // Tomador
      tomador: invoice.takerDocument ? {
        cpf_cnpj: invoice.takerDocument,
        razao_social: invoice.takerName,
        email: invoice.takerEmail
      } : undefined,
      // Serviço
      servico: {
        codigo: invoice.serviceCode || '1.05',
        descricao: invoice.serviceDescription || 'Serviços de automação de WhatsApp via IA',
        aliquota: config.aliquotIss
      },
      // Valores
      valor_servicos: invoice.serviceValue,
      valor_deducoes: invoice.deductionValue,
      valor_total: invoice.totalValue
    };
    
    try {
      const response = await fetch(`${baseUrl}/emissao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`,
          'X-Consumer-Key': config.apiSecret || ''
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok || data.erro) {
        return { 
          success: false, 
          error: data.mensagem || data.erro || 'Erro desconhecido' 
        };
      }
      
      // Salvar resposta completa
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { providerResponse: data }
      });
      
      return {
        success: true,
        invoiceId: data.uuid,
        invoiceNumber: data.numero,
        verificationCode: data.codigo_verificacao,
        invoiceUrl: data.link,
        pdfUrl: data.link_pdf,
        xmlUrl: data.link_xml,
        issuedAt: data.data_emissao ? new Date(data.data_emissao) : new Date()
      };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cancela uma NFS-e
   */
  async cancelInvoice(invoiceId: string, reason: string): Promise<IInvoiceResponse> {
    console.log(`[NFS-e] Cancelando nota ${invoiceId}: ${reason}`);
    
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { success: false, error: 'Nota não encontrada' };
    
    if (invoice.status !== 'issued') {
      return { success: false, error: 'Nota não pode ser cancelada (status inválido)' };
    }
    
    // Buscar configuração
    const config = await prisma.fiscalConfig.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: invoice.ownerType,
          ownerId: invoice.ownerId
        }
      }
    });
    
    if (!config) return { success: false, error: 'Configuração fiscal não encontrada' };
    
    try {
      let result: IInvoiceResponse;
      
      switch (config.provider) {
        case 'FOCUS_NFE':
          result = await this.cancelWithFocusNfe(invoice, config, reason);
          break;
        case 'NFE_IO':
          result = await this.cancelWithNfeIo(invoice, config, reason);
          break;
        case 'WEBMANIA':
          result = await this.cancelWithWebmania(invoice, config, reason);
          break;
        default:
          result = { success: false, error: `Provedor ${config.provider} não suportado` };
      }
      
      if (result.success) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelReason: reason
          }
        });
        
        await this.logAction(invoiceId, 'cancelled', reason);
      }
      
      return result;
      
    } catch (error: any) {
      console.error(`[NFS-e] Erro ao cancelar nota ${invoiceId}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cancela NFS-e via Focus NFe
   */
  private async cancelWithFocusNfe(invoice: any, config: any, reason: string): Promise<IInvoiceResponse> {
    const providerConfig = PROVIDER_CONFIGS.FOCUS_NFE;
    const baseUrl = config.apiEnvironment === 'production' 
      ? providerConfig.baseUrl 
      : providerConfig.homologationUrl;
    
    try {
      const response = await fetch(`${baseUrl}/nfse/${invoice.providerId}?motivo=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(config.apiToken + ':').toString('base64')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.mensagem || 'Erro ao cancelar' };
      }
      
      return { success: true };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cancela NFS-e via NFE.io
   */
  private async cancelWithNfeIo(invoice: any, config: any, reason: string): Promise<IInvoiceResponse> {
    const providerConfig = PROVIDER_CONFIGS.NFE_IO;
    const baseUrl = config.apiEnvironment === 'production' 
      ? providerConfig.baseUrl 
      : providerConfig.homologationUrl;
    
    try {
      const response = await fetch(`${baseUrl}/nfse/${invoice.providerId}/cancelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`,
          'X-Api-Key': config.apiSecret || ''
        },
        body: JSON.stringify({ motivo: reason })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.message || 'Erro ao cancelar' };
      }
      
      return { success: true };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cancela NFS-e via Webmania
   */
  private async cancelWithWebmania(invoice: any, config: any, reason: string): Promise<IInvoiceResponse> {
    const providerConfig = PROVIDER_CONFIGS.WEBMANIA;
    const baseUrl = config.apiEnvironment === 'production' 
      ? providerConfig.baseUrl 
      : providerConfig.homologationUrl;
    
    try {
      const response = await fetch(`${baseUrl}/cancelar/${invoice.providerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`,
          'X-Consumer-Key': config.apiSecret || ''
        },
        body: JSON.stringify({ motivo: reason })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.erro) {
        return { success: false, error: data.mensagem || 'Erro ao cancelar' };
      }
      
      return { success: true };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reenvia uma nota com erro
   */
  async retryInvoice(invoiceId: string): Promise<IInvoiceResponse> {
    console.log(`[NFS-e] Reenviando nota ${invoiceId}`);
    
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { success: false, error: 'Nota não encontrada' };
    
    if (invoice.status !== 'error') {
      return { success: false, error: 'Apenas notas com erro podem ser reenviadas' };
    }
    
    // Buscar configuração
    const config = await prisma.fiscalConfig.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: invoice.ownerType,
          ownerId: invoice.ownerId
        }
      }
    });
    
    if (!config) return { success: false, error: 'Configuração fiscal não encontrada' };
    
    // Incrementar contador de tentativas
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        retryCount: { increment: 1 },
        status: 'pending',
        errorMessage: null
      }
    });
    
    await this.logAction(invoiceId, 'resent', `Tentativa ${invoice.retryCount + 1}`);
    
    return this.emitWithProvider(invoiceId, config);
  }
  
  /**
   * Busca configuração fiscal
   */
  async getConfig(ownerType: 'reseller' | 'merchant', ownerId: string) {
    return prisma.fiscalConfig.findUnique({
      where: {
        ownerType_ownerId: { ownerType, ownerId }
      }
    });
  }
  
  /**
   * Salva configuração fiscal
   */
  async saveConfig(ownerType: 'reseller' | 'merchant', ownerId: string, data: any) {
    return prisma.fiscalConfig.upsert({
      where: {
        ownerType_ownerId: { ownerType, ownerId }
      },
      update: {
        ...data,
        updatedAt: new Date()
      },
      create: {
        ownerType,
        ownerId,
        ...data
      }
    });
  }
  
  /**
   * Lista notas fiscais
   */
  async listInvoices(
    ownerType: 'reseller' | 'merchant', 
    ownerId: string, 
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: any = { ownerType, ownerId };
    
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 20,
        skip: filters?.offset || 0
      }),
      prisma.invoice.count({ where })
    ]);
    
    return { invoices, total };
  }
  
  /**
   * Busca estatísticas de notas
   */
  async getStats(ownerType: 'reseller' | 'merchant', ownerId: string) {
    const stats = await prisma.invoice.groupBy({
      by: ['status'],
      where: { ownerType, ownerId },
      _count: true,
      _sum: {
        totalValue: true
      }
    });
    
    const totalIssued = await prisma.invoice.aggregate({
      where: { 
        ownerType, 
        ownerId, 
        status: 'issued' 
      },
      _count: true,
      _sum: { totalValue: true }
    });
    
    return {
      byStatus: stats,
      totalIssued: totalIssued._count,
      totalValueIssued: totalIssued._sum.totalValue || 0
    };
  }
  
  /**
   * Registra ação no log
   */
  private async logAction(invoiceId: string, action: string, details?: string) {
    await prisma.invoiceLog.create({
      data: {
        invoiceId,
        action,
        details,
        userType: 'system'
      }
    });
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const nfseService = new NFServicoService();
export default nfseService;
