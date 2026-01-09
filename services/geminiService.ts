
import { GoogleGenAI, Type } from "@google/genai";
import { Tool, Withdrawal } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getInventoryInsights = async (inventory: Tool[], history: Withdrawal[]) => {
  try {
    const prompt = `
      Analise o seguinte estoque de ferramentas de perfuração e o histórico de retiradas recentes.
      Forneça um breve resumo (máximo 3 parágrafos) sobre:
      1. Quais modelos (T45, T50, T51) estão sendo mais exigidos.
      2. Alertas críticos de reposição.
      3. Sugestão de otimização baseada nos motivos de retirada.

      Estoque Atual: ${JSON.stringify(inventory)}
      Histórico de Retiradas: ${JSON.stringify(history.slice(-10))}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Erro ao obter insights da IA:", error);
    return "Não foi possível carregar os insights no momento.";
  }
};
