/**
 * SERVIÇO DE TEMPLATES - SaaSWPP AI
 * 
 * Função auxiliar para uso de templates
 */

export async function useTemplate(
  merchantId: string,
  templateKey: string,
  variables: Record<string, string>
): Promise<string | null> {
  // Importação dinâmica para evitar dependência circular
  const { getTemplate, processTemplate } = await import('./templateService');
  
  const template = await getTemplate(merchantId, templateKey);
  if (!template) return null;

  return processTemplate(template.content, variables);
}

export default { useTemplate };
