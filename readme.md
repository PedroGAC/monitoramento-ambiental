# 🌎 Sistema Inteligente de Monitoramento Climático

![Badge](https://img.shields.io/badge/Status-Em%20Desenvolvimento-blue) 
![Badge](https://img.shields.io/badge/License-MIT-green)

🚀 **Sistema embarcado para monitoramento climático em tempo real**, utilizando a **BitDogLab RP2040** com sensores de temperatura, umidade e gases inflamáveis. O sistema processa os dados localmente e os exibe em um **display OLED**, além de enviá-los para uma **dashboard interativa**. Alertas visuais e sonoros são acionados em condições críticas, e uma **IA preditiva** da **API Groq** analisa tendências ambientais.

## 🔥 Funcionalidades

✅ **Coleta de dados ambientais** (DHT11 e MQ-2)  
✅ **Processamento embarcado** na **BitDogLab RP2040**  
✅ **Exibição local no display OLED**  
✅ **Transmissão de dados via Flask API**  
✅ **Dashboard interativa em React**  
✅ **Alertas visuais (matriz de LED) e sonoros (buzzer)**  
✅ **Análise preditiva com IA via API da Groq**  

---

## 🛠️ Tecnologias Utilizadas

- **BitDogLab RP2040** (Microcontrolador)
- **DHT11** (Temperatura e Umidade)
- **MQ-2** (Gás Inflamável)
- **Matriz de LED 5x5** (Alertas visuais)
- **Display OLED (I2C)** (Interface local)
- **Python (Flask API)** (Backend)
- **React.js** (Dashboard interativa)
- **API Groq** (Análise preditiva)