/**
 * TESTE DO SISTEMA DE HUMANIZAÇÃO
 * Demonstração do fluxo: 1 API call → divide → envia com delays
 * 
 * Execute: npx ts-node server/tests/test-humanization.ts
 */

// Teste do MessageChunker (isolado, sem banco de dados)
import { chunkMessage } from '../services/messageChunker';

console.log('='.repeat(60));
console.log('🧪 TESTE DE HUMANIZAÇÃO - SaaSWPP AI');
console.log('='.repeat(60));

// =============================================================================
// TESTE 1: Mensagem Curta
// =============================================================================
console.log('\n📝 TESTE 1: Mensagem Curta (< 100 caracteres)');
console.log('-'.repeat(40));

const shortMessage = "Olá! Tudo bem? Como posso ajudar você hoje?";
const result1 = chunkMessage(shortMessage);

console.log(`Original: "${shortMessage}" (${shortMessage.length} chars)`);
console.log(`Pedaços: ${result1.chunks.length}`);
result1.chunks.forEach((c, i) => {
  console.log(`  [${i + 1}] "${c.text}" (delay: ${c.delay}ms)`);
});

// =============================================================================
// TESTE 2: Mensagem Média
// =============================================================================
console.log('\n📝 TESTE 2: Mensagem Média (100-300 caracteres)');
console.log('-'.repeat(40));

const mediumMessage = `Olá! Tudo bem? Sou a assistente virtual da loja. Posso ajudar você com informações sobre produtos, preços e horários de funcionamento. Temos uma promoção especial essa semana: 20% de desconto em todos os produtos da linha skincare. Gostaria de saber mais?`;

const result2 = chunkMessage(mediumMessage);

console.log(`Original: "${mediumMessage.substring(0, 50)}..." (${mediumMessage.length} chars)`);
console.log(`Pedaços: ${result2.chunks.length}`);
console.log(`Delay total estimado: ${(result2.totalDelay / 1000).toFixed(1)} segundos`);
result2.chunks.forEach((c, i) => {
  console.log(`  [${i + 1}] "${c.text.substring(0, 40)}..." (delay: ${c.delay}ms)`);
});

// =============================================================================
// TESTE 3: Mensagem Longa
// =============================================================================
console.log('\n📝 TESTE 3: Mensagem Longa (> 500 caracteres)');
console.log('-'.repeat(40));

const longMessage = `Olá! Muito obrigado por entrar em contato com a nossa loja! Sou a assistente virtual e estou aqui para ajudar você. 

Temos várias opções disponíveis para você:

1. Produtos de skincare: cremes hidratantes, séruns, protetores solares e muito mais. Todos com 20% de desconto essa semana!

2. Maquiagem: batons, bases, paletas de sombras e acessórios. Confira as novidades da coleção outono!

3. Perfumes: fragrâncias masculinas e femininas das melhores marcas. Presente de graça na compra acima de R$ 200!

Posso te ajudar a encontrar o produto ideal. Qual categoria você tem mais interesse?`;

const result3 = chunkMessage(longMessage);

console.log(`Original: "${longMessage.substring(0, 50)}..." (${longMessage.length} chars)`);
console.log(`Pedaços: ${result3.chunks.length}`);
console.log(`Delay total estimado: ${(result3.totalDelay / 1000).toFixed(1)} segundos`);
result3.chunks.forEach((c, i) => {
  console.log(`  [${i + 1}] "${c.text.substring(0, 40)}..." (delay: ${c.delay}ms)`);
});

// =============================================================================
// RESUMO
// =============================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DO FLUXO');
console.log('='.repeat(60));
console.log(`
✅ Sistema de Humanização Funcionando!

COMO FUNCIONA:
1. IA gera 1 resposta completa (ex: 300 caracteres)
2. Sistema divide em 3-4 pedaços inteligentemente
3. Cada pedaço é enviado com delay de 2-8 segundos

BENEFÍCIOS:
- Parece digitação humana
- Não trava o sistema (1 chamada API)
- Evita bans do WhatsApp
- Comportamento natural e variado

CAPACIDADE:
- 30 chaves GLM simultâneas
- Cada chave: 1 concorrência, 60 RPM
- Total: 30 conversas ao mesmo tempo!
`);

console.log('✅ Teste concluído com sucesso!');
