const Binance = require('node-binance-api');
const TelegramBot = require('node-telegram-bot-api');
const WebSocket = require('ws');
const winston = require('winston');

// Configuración del logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs.log' })
  ]
});

// Configuración de la API de Binance
const binance = new Binance().options({
  APIKEY: 'aIsy7d5Et4LxnFDEdN2yiWDFEVA6xfAYOhSJ6PsqM8YHXOVzmuLp5NTby2MWjWAe',
  APISECRET: 'QQzCrApXlrVVk0CwAtPN8LQITgq2THOxIgSSoz9xbX17P9suyMXZR2WmJymLU4MZ',
  family: 4,
  useServerTime: true, // Opcional: para obtener la hora del servidor de Binance
});

// Configuración del bot de Telegram
const token = '6291470858:AAHeL8PhPC8gwut4AuqNfzmr2TNohUHmKCw';
const chatId = '5781897898';

const bot = new TelegramBot(token, { polling: true });

// Variables globales para los indicadores y umbrales
let shortSMA = 0;
let longSMA = 0;
let prevClose = 0;
let rsi = 0;
let gainSum = 0;
let lossSum = 0;
const RSI_OVERSOLD_THRESHOLD = 30;
const RSI_OVERBOUGHT_THRESHOLD = 70;
let interval = 600000; // 10 minutos por defecto

// Función para ajustar el intervalo basado en las condiciones del mercado
function adjustIntervalBasedOnMarketConditions() {
  // Aquí puedes agregar lógica para ajustar el intervalo según las condiciones del mercado
  // Por ejemplo, considerar la volatilidad del mercado, la liquidez, etc.
  // Esto es solo un ejemplo básico
  if (volatility > threshold) {
    interval = 300000; // 5 minutos si la volatilidad es alta
  } else {
    interval = 900000; // 15 minutos si la volatilidad es baja
  }
}

// Llamar a la función para ajustar el intervalo cada hora
setInterval(adjustIntervalBasedOnMarketConditions, 3600000); // 1 hora

// Función para obtener los datos de precios
async function getPriceData() {
  try {
    const ticker = await binance.prices('ANKRUSDT');
    const ANKRUSDTPrice = parseFloat(ticker.ANKRUSDT);
    const priceDiff = calculatePriceDiff(ANKRUSDTPrice);
    updateMovingAverages(ANKRUSDTPrice);
    rsi = calculateRSI(priceDiff);
    tradeStrategy();
    let message = `
      Precio actual de ANKRUSDT: ${ANKRUSDTPrice}
      Corto plazo (SMA 10): ${shortSMA.toFixed(4)}
      Largo plazo (SMA 20): ${longSMA.toFixed(4)}
      RSI: ${rsi.toFixed(2)}
      Fecha y hora: ${new Date().toLocaleString()}
    `;
    logger.log('info', message);
    bot.sendMessage(chatId, message);
  } catch (error) {
    logger.log('error', 'Error en getPriceData:', error);
    bot.sendMessage(chatId, `¡Error en getPriceData! ${error}`);
  }
}

// Función para calcular el RSI
function calculateRSI(priceDiff) {
  if (priceDiff > 0) {
    gainSum += priceDiff;
  } else {
    lossSum -= priceDiff;
  }
  const RS = gainSum / lossSum;
  return 100 - (100 / (1 + RS));
}

// Función para actualizar las medias móviles
function updateMovingAverages(price) {
  shortSMA = (shortSMA * 9 + price) / 10;
  longSMA = (longSMA * 19 + price) / 20;
}

// Función para calcular la diferencia de precios
function calculatePriceDiff(currentPrice) {
  const priceDiff = currentPrice - prevClose;
  prevClose = currentPrice;
  return priceDiff;
}

// Función para la estrategia de trading
function tradeStrategy() {
  if (rsi < RSI_OVERSOLD_THRESHOLD) {
    logger.log('info', "¡Comprar! RSI indica condiciones de sobreventa.");
    // Agregar lógica para comprar automáticamente
  } else if (rsi > RSI_OVERBOUGHT_THRESHOLD) {
    logger.log('info', "¡Vender! RSI indica condiciones de sobrecompra.");
    // Agregar lógica para vender automáticamente
  }
}

// Función para manejar los datos recibidos a través de websockets
const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
ws.on('message', (data) => {
  const tickers = JSON.parse(data);
  // Aquí puedes procesar los datos de los tickers en tiempo real
});

// Llamar a la función para obtener los datos de precios ahora
getPriceData();

// Llamar a la función cada cierto intervalo de tiempo
setInterval(getPriceData, interval);