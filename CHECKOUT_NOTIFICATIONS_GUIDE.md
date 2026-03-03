# FUNCIONALIDADES IMPLEMENTADAS - Checkout & Notificações

## 1. CHECKOUT STRIPE COM CPF/CNPJ ✅

### Arquivos Criados:
- `src/pages/CheckoutTrial.tsx` - Página de checkout completa
- `server/routes/checkout.ts` - Rotas de API para checkout

### Funcionalidades:
- **Coleta de CPF/CNPJ** com validação completa (dígitos verificadores)
- **Telefone WhatsApp obrigatório** com máscara automática
- **Integração Stripe** para planos pagos
- **Trial gratuito** com coleta de documento (qualificação de lead)
- **Máscara automática** para CPF, CNPJ e telefone
- **Validação em tempo real** dos campos

### Como Funciona:
1. Cliente clica em "Teste Gratuito" na landing page
2. Preenche nome, email, telefone, CPF/CNPJ e senha
3. Se for trial gratuito → Cria conta direto
4. Se for plano pago → Redireciona para Stripe Checkout
5. Após pagamento → Cria conta com dados do metadata

---

## 2. NOTIFICAÇÕES WHATSAPP PARA REVENDEDORES ✅

### Arquivos Criados:
- `server/services/notificationService.ts` - Serviço completo de notificações
- `src/pages/ResellerNotifications.tsx` - Página de configuração

### Funcionalidades:
- **5 tipos de notificações**:
  - 🎉 Nova Venda (com valor da comissão)
  - ⚠️ Trial Expirando (3 dias antes)
  - 🔴 Cliente Suspenso
  - ✅ Cliente Ativado
  - ⚠️ Pagamento Falhou

- **Configurações por tipo** - Revendedor escolhe o que receber
- **Mensagem de teste** - Testar se está funcionando
- **Ativar/Desativar** globalmente

### Como Funciona:
1. Revendedor acessa `/reseller/notifications`
2. Adiciona número do WhatsApp
3. Escolhe quais alertas receber
4. Clica em "Enviar Teste" para verificar
5. Salva configurações

---

## 3. CAMPOS ADICIONADOS AO BANCO ✅

### Modelo Reseller (Novos Campos):
```prisma
documentType       String?    // CPF ou CNPJ
documentNumber     String?    // Número do documento
whatsappNumber     String?    // Para notificações
notificationsEnabled Boolean   @default(true)
notifyNewSale       Boolean   @default(true)
notifyTrialExpiring Boolean   @default(true)
notifySuspended     Boolean   @default(true)
notifyActivated     Boolean   @default(true)
notifyPaymentFailed Boolean   @default(true)
stripeAccountId     String?    // Stripe Connect
```

### Modelo Merchant (Novos Campos):
```prisma
documentType       String?    // CPF ou CNPJ
documentNumber     String?    // Número do documento
phoneNumber        String?    // Telefone
stripeCheckoutSession String? // ID da sessão
```

---

## 4. ROTAS DE API ADICIONADAS ✅

### Checkout:
```
POST /api/checkout/create-session  - Cria sessão Stripe
POST /api/checkout/trial-register  - Trial com documento
GET  /api/checkout/verify-session  - Verifica pagamento
POST /api/checkout/validate-document - Valida CPF/CNPJ
```

### Reseller Notificações:
```
GET  /api/reseller/notifications     - Busca configurações
PUT  /api/reseller/notifications     - Atualiza configurações
POST /api/reseller/notifications/test - Envia teste
GET  /api/reseller/profile           - Perfil completo
PUT  /api/reseller/profile           - Atualiza perfil
```

---

## 5. COMO USAR

### Checkout Trial na Landing Page:

1. **Atualizar App.tsx** para incluir a rota:
```tsx
import { CheckoutTrial } from './pages/CheckoutTrial';

// Adicionar rota
<Route path="/checkout" element={<CheckoutTrial />} />
<Route path="/checkout/:plan" element={<CheckoutTrial />} />
```

2. **Atualizar LandingPage.tsx**:
```tsx
// Ao clicar em "Começar Teste Grátis"
<button onClick={() => navigate('/checkout/trial')}>
  Começar Teste Grátis
</button>

// Ao clicar em plano pago
<button onClick={() => navigate('/checkout/pro')}>
  Assinar Pro
</button>
```

### Configurar Notificações do Revendedor:

1. **Adicionar ao menu do revendedor**:
```tsx
<Link to="/reseller/notifications">
  <Bell className="w-4 h-4" />
  Notificações
</Link>
```

2. **Adicionar rota**:
```tsx
import { ResellerNotifications } from './pages/ResellerNotifications';

<Route path="/reseller/notifications" element={<ResellerNotifications />} />
```

---

## 6. INTEGRAÇÃO COM STRIPE

### Para Trial Gratuito:
- Não precisa de cartão
- Coleta CPF/CNPJ para qualificação
- Cria conta com status "trial"
- Envia código de verificação

### Para Planos Pagos:
- Cria sessão de checkout Stripe
- Coleta dados no checkout
- Após pagamento, cria conta automáticamente
- Notifica revendedor (se houver)

---

## 7. VALIDAÇÕES IMPLEMENTADAS

### CPF:
- 11 dígitos
- Validação do primeiro dígito verificador
- Validação do segundo dígito verificador
- Rejeita sequências iguais (111.111.111-11)

### CNPJ:
- 14 dígitos
- Validação dos dois dígitos verificadores
- Rejeita sequências iguais

### Telefone:
- DDD obrigatório
- 10 ou 11 dígitos
- Máscara automática: (XX) XXXXX-XXXX

---

## 8. PRÓXIMOS PASSOS

1. **Registrar rotas no server/index.ts**:
```ts
import { checkoutRoutes } from './routes/checkout';
app.use('/api/checkout', checkoutRoutes);
```

2. **Rodar migration**:
```bash
npx prisma migrate dev --name add_documents_and_notifications
```

3. **Testar checkout**:
- Acesse `/checkout/trial` para testar trial
- Acesse `/checkout/ID_DO_PLANO` para planos pagos

---

## 9. VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Evolution API (para notificações)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave
EVOLUTION_INSTANCE_NAME=MainInstance

# App URL
APP_URL=http://localhost:3000
```
