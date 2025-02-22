import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, ThermometerIcon, Droplets, Flame, GithubIcon, LinkedinIcon, MailIcon } from 'lucide-react';
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import GroqAnalysis from './GroqAnalysis';

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [currentData, setCurrentData] = useState({
    temperatura: 0,
    umidade: 0,
    gas: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [activeGraph, setActiveGraph] = useState('both'); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/data');
        const data = await response.json();

        const gasStatus = data.gas === 1 ? "Normal" : "Alerta";

        const processedData = {
          ...data,
          gasStatus,
          timestamp: new Date().toLocaleTimeString()
        };

        setCurrentData(processedData);
        setSensorData(prev => [...prev.slice(-49), processedData]);

        checkAlerts(processedData);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };

    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (metric, value) => {
    switch(metric) {
      case 'temperatura':
        return value > 30 ? 'bg-red-500' : value > 25 ? 'bg-yellow-500' : 'bg-green-500';
      case 'umidade':
        return value > 80 ? 'bg-red-500' : value < 30 ? 'bg-yellow-500' : 'bg-green-500';
      case 'gas':
        return value === 1 ? 'bg-green-500' : 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const checkAlerts = (data) => {
    const newAlerts = [];

    if (data.temperatura > 30) {
      newAlerts.push({ type: 'temperatura', message: 'Temperatura muito alta!', value: data.temperatura });
    }

    if (data.umidade > 80) {
      newAlerts.push({ type: 'umidade', message: 'Umidade crítica!', value: data.umidade });
    }

    if (data.gas === 0) {
      newAlerts.push({ type: 'gas', message: 'Gás detectado! Verifique o ambiente!', value: 'Alerta' });
    }

    setAlerts(newAlerts);
  };

  const renderGraph = () => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sensorData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          {(activeGraph === 'both' || activeGraph === 'temperatura') && (
            <Area 
              type="monotone" 
              dataKey="temperatura" 
              stroke="#ef4444" 
              fill="#fee2e2" 
              name="Temperatura" 
            />
          )}
          {(activeGraph === 'both' || activeGraph === 'umidade') && (
            <Area 
              type="monotone" 
              dataKey="umidade" 
              stroke="#3b82f6" 
              fill="#dbeafe" 
              name="Umidade" 
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-100 min-h-screen">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-4xl text-center">Monitor Climático</CardTitle>
          <p className="text-gray-600 text-center mt-2">Sistema Inteligente de Monitoramento em Tempo Real</p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className={`h-2 ${getStatusColor('temperatura', currentData.temperatura)}`}></div>
          <CardContent className="p-6 text-center">
            <ThermometerIcon size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Temperatura</h2>
            <p className="text-3xl font-bold text-gray-900">{currentData.temperatura}°C</p>
          </CardContent>
        </Card>

        <Card>
          <div className={`h-2 ${getStatusColor('umidade', currentData.umidade)}`}></div>
          <CardContent className="p-6 text-center">
            <Droplets size={32} className="text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Umidade</h2>
            <p className="text-3xl font-bold text-gray-900">{currentData.umidade}%</p>
          </CardContent>
        </Card>

        <Card>
          <div className={`h-2 ${getStatusColor('gas', currentData.gas)}`}></div>
          <CardContent className="p-6 text-center">
            <Flame size={32} className={currentData.gas === 1 ? "text-green-500 mx-auto mb-4" : "text-red-500 mx-auto mb-4"} />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Gás (MQ-2)</h2>
            <p className="text-3xl font-bold text-gray-900">{currentData.gas === 1 ? "Normal" : "ALERTA"}</p>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Alertas Ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3">
                <AlertCircle className="text-red-500" size={24} />
                <div>
                  <h3 className="font-semibold text-red-800">{alert.type.toUpperCase()}</h3>
                  <p className="text-red-600">{alert.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Histórico</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant={activeGraph === 'both' ? "default" : "outline"}
              onClick={() => setActiveGraph('both')}
            >
              Ambos
            </Button>
            <Button 
              variant={activeGraph === 'temperatura' ? "default" : "outline"}
              onClick={() => setActiveGraph('temperatura')}
            >
              Temperatura
            </Button>
            <Button 
              variant={activeGraph === 'umidade' ? "default" : "outline"}
              onClick={() => setActiveGraph('umidade')}
            >
              Umidade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {renderGraph()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <GroqAnalysis sensorData={currentData} />
        </CardContent>
      </Card>

      {/* Nova seção de créditos */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-center">Desenvolvido por</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">Pedro Germano Agripino Cruz</h3>
            <p className="text-gray-600 mb-4">Discente de Engenharia Elétrica</p>
            
            <div className="flex justify-center gap-4">
              <a 
                href="https://github.com/PedroGAC" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <GithubIcon size={24} />
              </a>
              <a 
                href="https://www.linkedin.com/in/pedro-germano-ac/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LinkedinIcon size={24} />
              </a>
              <a 
                href="mailto:pedro.cruz@estudante.cear.ufpb.br" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <MailIcon size={24} />
              </a>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p>© 2024 Monitor Climático - Todos os direitos reservados</p>
              <p className="mt-1">v1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;