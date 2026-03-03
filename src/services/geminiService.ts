// --- FRONTEND-SAFE GEMINI SERVICE ---
// Este serviço foi adaptado para rodar no navegador (Client-Side)
// Em produção real, a chave API deve ficar no backend.
// Aqui usamos a chave pública para fins de demonstração.

import { GoogleGenAI } from '@google/genai';

// Inicializa o cliente Gemini apenas se a chave estiver disponível
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateAIResponse(merchantId: string, customerPhone: string, message: string) {
  if (!ai) {
    console.warn('Gemini API Key not found. Returning mock response.');
    return { reply: "Olá! Sou a IA da loja (Modo Demo). Configure sua chave API para respostas reais.", action: 'NONE' };
  }

  try {
    // Simulação de RAG (Retrieval-Augmented Generation) no Frontend
    const systemInstruction = `
      Você é um assistente virtual prestativo para a loja ${merchantId}.
      Responda de forma curta e educada.
      Se o cliente perguntar sobre preços, invente um valor razoável.
      Se o cliente quiser agendar, use a tag [SCHEDULE_REQUEST].
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    let reply = result.text || "Desculpe, não entendi.";
    let action = 'NONE';

    // Detect Tags
    if (reply.includes('[SCHEDULE_REQUEST]')) {
      reply = reply.replace('[SCHEDULE_REQUEST]', '').trim();
      action = 'SCHEDULE_REQUEST';
    }

    return { reply, action };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { reply: "Erro ao conectar com a IA. Tente novamente.", action: 'ERROR' };
  }
}
