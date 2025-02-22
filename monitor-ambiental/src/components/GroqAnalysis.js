import React, { useState, useEffect, useRef } from 'react';
import { analyzeWithGroq } from '../services/api';

const GroqAnalysis = ({ sensorData }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const previousTemp = useRef(sensorData.temperatura);
  const lastRequestRef = useRef(null);
  const lastAnalysisRef = useRef(0); // Armazena o timestamp da última análise

  const performAnalysis = async () => {
    const now = Date.now();
    if (now - lastAnalysisRef.current < 10000) { // 🔹 Evita múltiplas chamadas seguidas (mínimo 10s)
      console.log("Análise ignorada: Muito cedo para uma nova requisição.");
      return;
    }

    if (isAnalyzing) return; // 🔹 Evita chamadas simultâneas

    setLoading(true);
    setError(null);
    setIsAnalyzing(true);

    try {
      console.log("Iniciando análise com dados:", sensorData);
      const result = await analyzeWithGroq(sensorData);
      setAnalysis(result);
      setLastAnalysisTime(new Date());
      previousTemp.current = sensorData.temperatura;
      lastAnalysisRef.current = Date.now(); // 🔹 Atualiza o tempo da última análise
    } catch (err) {
      setError('Falha ao obter análise');
      console.error("Erro na análise:", err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsAnalyzing(false), 15000); // 🔹 Impede novas análises por 15s após cada requisição
    }
  };

  useEffect(() => {
    const shouldAnalyze = () => {
      if (!lastAnalysisTime) return true; // Primeira análise

      const now = Date.now();
      const timeSinceLastAnalysis = now - lastAnalysisRef.current;
      const fiveMinutes = 5 * 60 * 1000; // 5 minutos

      return (
        timeSinceLastAnalysis > fiveMinutes ||  // ⏳ Espera 5 minutos
        sensorData.gas === 0 ||  // 🚨 Se detectar gás (0 = problema)
        Math.abs(sensorData.temperatura - previousTemp.current) > 5 // 🔥 Se temperatura variar mais de 5°C
      );
    };

    if (shouldAnalyze() && !isAnalyzing) {
      clearTimeout(lastRequestRef.current);
      lastRequestRef.current = setTimeout(() => {
        performAnalysis();
      }, 5000); // 🔹 Aguarda 5s antes de chamar a análise
    }
  }, [sensorData]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Análise Inteligente</h2>
        {loading ? (
          <span className="text-sm text-blue-500">Atualizando análise...</span>
        ) : (
          <span className="text-sm text-gray-500">
            Última análise: {lastAnalysisTime ? new Date(lastAnalysisTime).toLocaleTimeString() : 'Nunca'}
          </span>
        )}
      </div>

      {error ? (
        <div className="text-red-500 bg-red-50 p-4 rounded flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-lg">
          <pre className="whitespace-pre-wrap font-sans text-gray-700">
            {analysis || "Aguardando primeira análise..."}
          </pre>
        </div>
      )}

      <button 
        onClick={performAnalysis}
        disabled={loading || isAnalyzing}
        className={`mt-4 px-4 py-2 rounded-lg ${
          loading || isAnalyzing
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {loading ? 'Analisando...' : 'Atualizar Análise'}
      </button>
    </div>
  );
};

export default GroqAnalysis;
