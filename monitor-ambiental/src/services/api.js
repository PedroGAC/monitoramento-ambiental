const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

export const analyzeWithGroq = async (data) => {
  try {
    console.log("Enviando dados para análise:", data); // Debug para verificar os dados enviados

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",  // ou outro modelo disponível na Groq
        messages: [
          {
            role: "system",
            content: "Você é um especialista em análise ambiental. Analise os dados fornecidos e forneça insights relevantes sobre as condições ambientais, riscos potenciais e recomendações práticas."
          },
          {
            role: "user",
            content: `Analise os seguintes dados ambientais:
            - Temperatura: ${data.temperatura}°C
            - Umidade: ${data.umidade}%
            - Gás: ${data.gas === 1 ? 'Normal' : 'ALERTA'}

            Forneça:
            1. Avaliação das condições atuais
            2. Riscos potenciais
            3. Recomendações práticas
            4. Sugestões de ação imediata, se necessário.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      console.error(`Erro na requisição Groq: ${response.status}`);
      if (response.status === 429) {
        throw new Error("Muitas requisições. Aguarde antes de tentar novamente.");
      }
      throw new Error(`Erro na API: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Resposta da API Groq:", result); // Debug da resposta

    // Verifica se há conteúdo na resposta antes de tentar acessá-lo
    if (!result.choices || result.choices.length === 0) {
      throw new Error("Resposta inválida da IA.");
    }

    return result.choices[0].message.content.trim() || "Nenhuma resposta válida da IA.";
  } catch (error) {
    console.error('Erro na análise Groq:', error);
    return error.message || 'Erro na análise. Por favor, tente novamente.';
  }
};

export const fetchSensorData = async () => {
  try {
    console.log("Buscando dados dos sensores..."); // Debug para verificar chamadas

    const response = await fetch('http://localhost:5000/data');
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Dados recebidos dos sensores:", data); // Debug dos dados recebidos

    return data;
  } catch (error) {
    console.error('Erro ao buscar dados dos sensores:', error);
    throw error;
  }
};
