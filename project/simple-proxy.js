import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = 3035;

// Отключаем проверку сертификатов SSL для HTTPS запросов
const agent = new https.Agent({
  rejectUnauthorized: false
});

const server = http.createServer((req, res) => {
  // Поддержка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma, Expires, Accept, Accept-Language, Origin, User-Agent, Referer');
  
  // Обработка OPTIONS запросов для поддержки CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Проверка здоровья сервера
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  
  // Парсинг параметра URL из запроса
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  const targetUrl = reqUrl.searchParams.get('url');
  
  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'URL parameter is required' }));
    return;
  }
  
  console.log(`Proxying request to: ${targetUrl}`);
  
  // Выбираем HTTP или HTTPS в зависимости от целевого URL
  const httpModule = targetUrl.startsWith('https') ? https : http;
  
  try {
    // Настройка параметров запроса
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, application/json, text/plain, */*',
        'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8',
        'Referer': 'https://google.com/'
      }
    };
    
    // Для HTTPS запросов добавляем игнорирование проверки сертификатов
    if (targetUrl.startsWith('https')) {
      options.agent = agent;
    }
    
    const proxyReq = httpModule.request(targetUrl, options, (proxyRes) => {
      console.log('Response received with status:', proxyRes.statusCode);
      
      // Передаем заголовки ответа
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        // Не передаем заголовки, которые могут вызвать проблемы
        if (key !== 'content-encoding' && key !== 'content-length') {
          res.setHeader(key, value);
        }
      });
      
      // Устанавливаем заголовки CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Передаем код состояния
      res.writeHead(proxyRes.statusCode);
      
      // Собираем все данные
      let responseData = Buffer.alloc(0);
      
      proxyRes.on('data', (chunk) => {
        responseData = Buffer.concat([responseData, chunk]);
      });
      
      proxyRes.on('end', () => {
        console.log(`Successfully proxied response: status=${proxyRes.statusCode}, length=${responseData.length}`);
        res.end(responseData);
      });
    });
    
    // Обработка ошибок запроса
    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: error.message,
        details: error.stack,
        url: targetUrl
      }));
    });
    
    // Устанавливаем таймаут в 30 секунд
    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy(new Error('Request timeout after 30 seconds'));
    });
    
    // Завершаем запрос
    proxyReq.end();
    
  } catch (error) {
    console.error('Error initiating proxy request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: error.message,
      details: error.stack,
      url: targetUrl
    }));
  }
});

server.listen(PORT, () => {
  console.log(`Simple CORS Proxy Server running at http://localhost:${PORT}`);
  console.log(`Use http://localhost:${PORT}/?url=YOUR_URL to proxy requests`);
}); 