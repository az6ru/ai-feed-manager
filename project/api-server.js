import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3040;

// Включаем CORS
app.use(cors());

// Папка для хранения сгенерированных фидов
const FEEDS_DIR = path.join(process.cwd(), 'feeds');

// Создаем директорию для фидов если не существует
async function ensureFeedsDir() {
  try {
    await fs.mkdir(FEEDS_DIR, { recursive: true });
    console.log(`Директория для фидов создана: ${FEEDS_DIR}`);
  } catch (err) {
    console.error('Ошибка при создании директории для фидов:', err);
  }
}

// Endpoint для получения фида по ID
app.get('/feed/:feedId', async (req, res) => {
  try {
    const { feedId } = req.params;
    
    // Безопасно проверяем ID фида, чтобы избежать path traversal
    if (!feedId || /[\/\\]/.test(feedId)) {
      return res.status(400).send('Некорректный ID фида');
    }
    
    const feedPath = path.join(FEEDS_DIR, `${feedId}.xml`);
    
    try {
      // Проверяем существование файла
      await fs.access(feedPath);
    } catch (err) {
      console.error(`Фид не найден: ${feedPath}`);
      return res.status(404).send('Фид не найден');
    }
    
    // Читаем и отправляем файл
    const xmlContent = await fs.readFile(feedPath, 'utf-8');
    
    // Устанавливаем правильные заголовки для XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Отправляем XML
    res.send(xmlContent);
    
  } catch (error) {
    console.error('Ошибка при получении фида:', error);
    res.status(500).send('Внутренняя ошибка сервера');
  }
});

// Endpoint для удаления фида
app.delete('/feed/:feedId', async (req, res) => {
  try {
    const { feedId } = req.params;
    
    // Безопасно проверяем ID фида
    if (!feedId || /[\/\\]/.test(feedId)) {
      return res.status(400).send('Некорректный ID фида');
    }
    
    const feedPath = path.join(FEEDS_DIR, `${feedId}.xml`);
    
    try {
      // Проверяем существование файла
      await fs.access(feedPath);
    } catch (err) {
      console.error(`Фид не найден при попытке удаления: ${feedPath}`);
      return res.status(404).send('Фид не найден');
    }
    
    // Удаляем файл
    await fs.unlink(feedPath);
    
    // Отправляем успешный ответ
    res.status(200).json({
      success: true,
      message: `Фид ${feedId} успешно удален`
    });
    
  } catch (error) {
    console.error('Ошибка при удалении фида:', error);
    res.status(500).send('Внутренняя ошибка сервера');
  }
});

// Endpoint для обновления/генерации фида
app.post('/feed/:feedId', express.text({ limit: '50mb', type: 'application/xml' }), async (req, res) => {
  try {
    const { feedId } = req.params;
    
    // Безопасно проверяем ID фида
    if (!feedId || /[\/\\]/.test(feedId)) {
      return res.status(400).send('Некорректный ID фида');
    }
    
    // Проверяем, что есть данные XML для сохранения
    const xmlContent = req.body;
    if (!xmlContent || !xmlContent.trim().startsWith('<?xml')) {
      return res.status(400).send('Некорректные данные XML');
    }
    
    // Гарантируем, что директория существует
    await ensureFeedsDir();
    
    // Путь к файлу
    const feedPath = path.join(FEEDS_DIR, `${feedId}.xml`);
    
    // Сохраняем XML в файл
    await fs.writeFile(feedPath, xmlContent);
    
    // Возвращаем URL для доступа к фиду
    const feedUrl = `http://localhost:${PORT}/feed/${feedId}`;
    
    res.status(200).json({
      success: true,
      feedId,
      url: feedUrl
    });
    
  } catch (error) {
    console.error('Ошибка при сохранении фида:', error);
    res.status(500).send('Внутренняя ошибка сервера');
  }
});

// Endpoint для проверки здоровья API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Запускаем сервер
ensureFeedsDir().then(() => {
  app.listen(PORT, () => {
    console.log(`API сервер для XML-фидов запущен на порту ${PORT}`);
    console.log(`Доступ к фидам: http://localhost:${PORT}/feed/[feedId]`);
  });
}); 