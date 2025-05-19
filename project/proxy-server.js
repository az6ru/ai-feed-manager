import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3030;

// Расширенная настройка CORS
app.use(cors({
  origin: '*', // Разрешаем все источники
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Обработчик OPTIONS запросов
app.options('/proxy', cors());

// Проверка работоспособности сервера
app.get('/proxy', async (req, res) => {
  // Для проверки доступности сервера
  if (req.query.health === 'check') {
    console.log('Health check request received');
    return res.status(200).send({ status: 'ok' });
  }
  
  // Проверка параметра URL
  const url = req.query.url;
  if (!url) {
    return res.status(400).send({ error: 'URL parameter is required' });
  }
  
  try {
    console.log(`Proxying request to: ${url}`);
    
    // Запрос к целевому URL
    const response = await axios({
      method: 'get',
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, application/json, text/plain, */*',
        'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://google.com/'
      },
      timeout: 30000, // 30 seconds timeout
      responseType: 'arraybuffer', // Для правильной обработки бинарных данных и разных кодировок
      maxRedirects: 5 // Разрешаем до 5 редиректов
    });
    
    // Устанавливаем тот же тип контента, что получили от целевого сервера
    res.set('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.set('Access-Control-Allow-Origin', '*');
    
    console.log('Successfully proxied response:', {
      status: response.status,
      contentType: response.headers['content-type'],
      dataLength: response.data.length
    });
    
    // Возвращаем тело ответа
    return res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Обработка ошибок от axios
    if (error.response) {
      // Сервер ответил статусом вне диапазона 2xx
      console.error(`Target server responded with status ${error.response.status}`);
      
      // Установка заголовков CORS даже при ошибке
      res.set('Access-Control-Allow-Origin', '*');
      
      return res.status(error.response.status).send({
        error: `Target server responded with status ${error.response.status}`,
        message: error.message
      });
    } else if (error.request) {
      // Запрос был сделан, но ответ не получен
      console.error('No response received from target server:', error.request);
      
      res.set('Access-Control-Allow-Origin', '*');
      
      return res.status(504).send({
        error: 'No response received from target server',
        message: error.message
      });
    } else {
      // Ошибка при настройке запроса
      console.error('Error setting up the request:', error);
      
      res.set('Access-Control-Allow-Origin', '*');
      
      return res.status(500).send({
        error: 'Error setting up the request',
        message: error.message
      });
    }
  }
});

// Обработка корневого маршрута
app.get('/', (req, res) => {
  res.send('CORS Proxy Server - append /proxy?url=YOUR_URL to use');
});

// Запуск сервера
app.listen(port, () => {
  console.log(`CORS Proxy server running at http://localhost:${port}`);
  console.log(`Use http://localhost:${port}/proxy?url=YOUR_URL to proxy requests`);
}); 