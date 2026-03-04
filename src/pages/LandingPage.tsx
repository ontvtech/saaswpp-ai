import React from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, ShieldCheck, Zap, BrainCircuit, ArrowRight, CheckCircle2, 
  Bot, Calendar, TrendingUp, Users, Clock, Headphones, Star, ChevronDown,
  Store, Wrench, Stethoscope, Scissors, Coffee, Car, Sparkles
} from 'lucide-react';
import { cn } from '../utils/cn';

interface LandingPageProps {
  onLogin: (view?: 'login' | 'trial') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      {/* Nav */}
      <nav className="h-20 border-b border-border/50 flex items-center justify-between px-8 md:px-20 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">SaaSWPP</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#como-funciona" className="text-sm font-medium hover:text-primary transition-colors">Como Funciona</a>
          <a href="#recursos" className="text-sm font-medium hover:text-primary transition-colors">Recursos</a>
          <a href="#planos" className="text-sm font-medium hover:text-primary transition-colors">Planos</a>
          <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">FAQ</a>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => onLogin('login')} className="text-sm font-medium hover:text-primary transition-colors">Entrar</button>
          <button onClick={() => onLogin('trial')} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
            Teste Grátis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-8 md:px-20 max-w-7xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-5 pointer-events-none">
          <BrainCircuit className="w-full h-full" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center"
        >
          <span className="tech-label text-primary mb-6 inline-block px-4 py-2 bg-primary/5 border border-primary/10 rounded-full">
            ✨ Inteligência Artificial 100% em Português
          </span>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] uppercase mb-8">
            Seu WhatsApp<br />
            <span className="text-primary">Vendendo Sozinho</span><br />
            24 Horas por Dia
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Uma inteligência artificial que <strong>atende,agenda, vende e fideliza</strong> seus clientes 
            pelo WhatsApp. Feita para clínicas, oficinas, salões e negócios locais que querem 
            <strong className="text-primary"> crescer sem aumentar a equipe</strong>.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button onClick={() => onLogin('trial')} className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-3">
              Começar Teste Grátis <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => onLogin('login')} className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-bold border-2 border-border hover:bg-muted transition-all">
              Ver Demonstração
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 7 dias grátis</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Sem cartão</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Cancelamento fácil</span>
          </div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-muted/20 py-10">
        <div className="max-w-7xl mx-auto px-8 md:px-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Negócios Atendidos", val: "500+" },
            { label: "Mensagens por Mês", val: "2M+" },
            { label: "Taxa de Resposta", val: "98%" },
            { label: "Aumento nas Vendas", val: "+35%" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl md:text-4xl font-black tracking-tighter uppercase mb-1 text-primary">{s.val}</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 px-8 md:px-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="tech-label text-primary mb-4 inline-block">COMO FUNCIONA</span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
            Simples de Configurar,<br />Poderoso nas Vendas
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Em menos de 10 minutos sua IA já está atendendo clientes e vendendo pelo WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              step: "01",
              title: "Conecte seu WhatsApp", 
              desc: "Escaneie o QR Code e conecte seu número em segundos. Funciona com qualquer operadora e não precisa de número novo.",
              icon: MessageSquare
            },
            { 
              step: "02",
              title: "Configure a IA", 
              desc: "Conte sobre seu negócio: serviços, preços, horários. A IA aprende e responde como se fosse você.",
              icon: BrainCircuit
            },
            { 
              step: "03",
              title: "Venda Automaticamente", 
              desc: "A IA atende, tira dúvidas, agenda horários e fecha vendas. Você só acompanha os resultados.",
              icon: TrendingUp
            }
          ].map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass-card p-8 relative group"
            >
              <span className="absolute top-4 right-4 text-4xl font-black text-muted/20 group-hover:text-primary/20 transition-colors">{f.step}</span>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Para Quem Serve */}
      <section className="py-24 px-8 md:px-20 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="tech-label text-primary mb-4 inline-block">PARA QUEM É</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
              Feito para Negócios Locais
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Stethoscope, name: "Clínicas", desc: "Agendamentos" },
              { icon: Car, name: "Oficinas", desc: "Orçamentos" },
              { icon: Scissors, name: "Salões", desc: "Horários" },
              { icon: Store, name: "Comércio", desc: "Vendas" },
              { icon: Coffee, name: "Restaurantes", desc: "Pedidos" },
              { icon: Wrench, name: "Serviços", desc: "Atendimento" },
            ].map((item, i) => (
              <div key={i} className="glass-card p-6 text-center hover:border-primary/50 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                  <item.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm mb-1">{item.name}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-24 px-8 md:px-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="tech-label text-primary mb-4 inline-block">RECURSOS</span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
            Tudo que Você Precisa<br />em Um Só Lugar
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { 
              icon: Bot, 
              title: "Atendente IA 24h", 
              desc: "Responde instantaneamente a qualquer hora. Nunca perde uma venda por falta de atendimento." 
            },
            { 
              icon: Calendar, 
              title: "Agendamento Inteligente", 
              desc: "Clientes agendam pelo WhatsApp. Você aprova com um clique. Sem confusão de horários." 
            },
            { 
              icon: BrainCircuit, 
              title: "IA que Aprende", 
              desc: "Quanto mais usa, mais inteligente fica. Aprende seus produtos, preços e jeito de atender." 
            },
            { 
              icon: TrendingUp, 
              title: "Caçador de Vendas", 
              desc: "Identifica clientes prontos para comprar e aborda no momento certo. Nunca deixe dinheiro na mesa." 
            },
            { 
              icon: Users, 
              title: "CRM Integrado", 
              desc: "Veja histórico de cada cliente, preferências e status. Conheça seu cliente como nunca." 
            },
            { 
              icon: ShieldCheck, 
              title: "Modo Crise", 
              desc: "Detecta clientes insatisfeitos e te avisa imediatamente. Resolva problemas antes de virarem reclamações." 
            },
            { 
              icon: Zap, 
              title: "Respostas Instantâneas", 
              desc: "Velocidade de resposta queimpressiona. Clientes não esperam e você não perde vendas." 
            },
            { 
              icon: Headphones, 
              title: "Suporte Humano", 
              desc: "Quando a IA não dá conta, você assume. Transição suave entre bot e humano." 
            },
            { 
              icon: Sparkles, 
              title: "Mensagens Humanizadas", 
              desc: "A IA escreve como humano, com variações naturais. Ninguém percebe que é automático." 
            }
          ].map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 hover:border-primary/30 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-24 px-8 md:px-20 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="tech-label text-primary mb-4 inline-block">RESULTADOS</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
              O que Dizem Nossos Clientes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Clínica Saúde Total",
                type: "Clínica de Estética",
                text: "Dobramos os agendamentos no primeiro mês. A IA atende enquanto a equipe foca no atendimento presencial.",
                result: "+100% agendamentos"
              },
              {
                name: "Auto Center Silva",
                type: "Oficina Mecânica",
                text: "Antes perdíamos muita gente que mandava mensagem fora do horário. Agora a IA converte até de madrugada.",
                result: "+R$ 15k/mês"
              },
              {
                name: "Salão Bella Donna",
                type: "Salão de Beleza",
                text: "Minhas clientes adoram poder agendar pelo WhatsApp a qualquer hora. O cancelamento caiu pela metade.",
                result: "-50% faltas"
              }
            ].map((dep, i) => (
              <div key={i} className="glass-card p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">"{dep.text}"</p>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <p className="font-bold">{dep.name}</p>
                    <p className="text-xs text-muted-foreground">{dep.type}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{dep.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 px-8 md:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="tech-label text-primary mb-4 inline-block">PLANOS</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
              Invista no Crescimento<br />do Seu Negócio
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Escolha o plano ideal. Todos incluem WhatsApp conectado e IA funcionando.
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                name: "START", 
                price: "97",
                features: [
                  "1 Número WhatsApp",
                  "5.000 mensagens IA/mês",
                  "Atendente automático",
                  "Base de conhecimento",
                  "Relatórios básicos",
                  "Suporte por email"
                ], 
                popular: false 
              },
              { 
                name: "PRO", 
                price: "247",
                features: [
                  "1 Número WhatsApp",
                  "20.000 mensagens IA/mês",
                  "Tudo do START +",
                  "Agendamento inteligente",
                  "CRM de clientes",
                  "Caçador de vendas",
                  "Suporte prioritário"
                ], 
                popular: true 
              },
              { 
                name: "TOP AI", 
                price: "497",
                features: [
                  "3 Números WhatsApp",
                  "50.000 mensagens IA/mês",
                  "Tudo do PRO +",
                  "IA Preditiva avançada",
                  "Gestão de crises",
                  "API de integração",
                  "Gerente dedicado"
                ], 
                popular: false 
              },
            ].map((p, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "glass-card p-8 flex flex-col relative",
                  p.popular && "border-primary shadow-2xl shadow-primary/10 scale-105 z-10"
                )}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-full">
                    Mais Popular
                  </div>
                )}
                
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">Para quem está começando</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="text-5xl font-black">{p.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                
                <button 
                  onClick={() => onLogin('trial')} 
                  className={cn(
                    "w-full py-3 rounded-xl font-bold transition-all text-sm",
                    p.popular 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105" 
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  Começar Agora
                </button>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            💳 Aceitamos cartão de crédito, PIX e boleto. Cancele quando quiser, sem multa.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-8 md:px-20 bg-muted/10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="tech-label text-primary mb-4 inline-block">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Preciso ter conhecimento técnico?",
                a: "Não! O sistema foi feito para ser simples. Você configura tudo em minutos, sem programação. Se conseguir usar o WhatsApp, consegue usar o SaaSWPP."
              },
              {
                q: "Funciona com meu número atual?",
                a: "Sim! Você usa seu próprio número de WhatsApp. Não precisa de chip novo ou número diferente. Seus clientes continuam falando com o mesmo número."
              },
              {
                q: "A IA consegue atender meu tipo de negócio?",
                a: "Sim! A IA aprende sobre seu negócio a partir das informações que você fornece. Funciona para clínicas, oficinas, salões, restaurantes, lojas e qualquer negócio que atenda clientes."
              },
              {
                q: "E se a IA não souber responder?",
                a: "A IA identifica quando não sabe responder e te avisa. Você pode assumir a conversa a qualquer momento. Transição suave, cliente não percebe."
              },
              {
                q: "Qual o risco do meu WhatsApp ser banido?",
                a: "Nosso sistema usa técnicas de humanização avançadas. A IA responde com timing natural, como um humano. Milhares de clientes usando sem problemas."
              },
              {
                q: "Posso cancelar a qualquer momento?",
                a: "Sim! Sem multa, sem burocracia. Você cancela quando quiser diretamente no painel. Seus dados ficam guardados por 30 dias caso queira voltar."
              }
            ].map((faq, i) => (
              <details key={i} className="glass-card p-6 cursor-pointer group">
                <summary className="flex items-center justify-between font-bold list-none">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-muted-foreground mt-4 leading-relaxed text-sm">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-8 md:px-20">
        <div className="max-w-4xl mx-auto text-center glass-card p-12 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
              Pronto para<br /><span className="text-primary">Vender Mais?</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Comece seu teste grátis de 7 dias agora mesmo. Sem cartão de crédito, sem compromisso.
            </p>
            <button 
              onClick={() => onLogin('trial')} 
              className="bg-primary text-primary-foreground px-10 py-4 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 hover:scale-105 transition-all inline-flex items-center gap-3"
            >
              Começar Teste Grátis <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border px-8 md:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="font-bold">SaaSWPP</span>
            </div>
            
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
              <a href="#" className="hover:text-primary transition-colors">Suporte</a>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 SaaSWPP. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
