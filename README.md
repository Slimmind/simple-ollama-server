# Simple Ollama Server

Простой сервер для работы с Ollama API, который может отправлять ответы на указанный email адрес или возвращать их напрямую в ответе.

## Возможности

- Интеграция с Ollama API
- Опциональная отправка ответов на email
- Защита от DDoS-атак (rate limiting)
- Структурированное логирование
- CORS поддержка
- Graceful shutdown
- Валидация email адресов (если email указан)
- HTTPS поддержка

## Требования

- Node.js (версия 14 или выше)
- Ollama (должен быть запущен локально на порту 11434)
- SSL сертификаты (private.key и certificate.crt)
- Gmail аккаунт для отправки email (только если планируется использовать email функционал)

## Установка

1. Клонируйте репозиторий:

```bash
git clone https://github.com/Slimmind/simple-ollama-server.git
cd simple-ollama-server
```

2. Установите зависимости:

```bash
npm install
```

3. Создайте файл `.env` в корневой директории проекта со следующим содержимым:

```
PORT=3000
NODE_ENV=development
# Следующие переменные нужны только если планируется использовать email функционал
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

4. Убедитесь, что у вас есть SSL сертификаты:

- private.key
- certificate.crt

## Запуск

### Development режим

```bash
npm run dev
```

### Production режим

```bash
npm start
```

Сервер будет доступен по адресу: `https://localhost:3000`

## API Endpoints

### POST /ask

Отправляет запрос к Ollama API и может отправить ответ на указанный email (если email указан).

**Параметры запроса:**

```json
{
	"model": "llama2",
	"prompt": "Your question here",
	"email": "recipient@example.com" // опционально
}
```

**Успешный ответ:**

Если email указан:

```json
{
	"response": "Response from Ollama",
	"message": "Response sent to your email"
}
```

Если email не указан:

```json
{
	"response": "Response from Ollama"
}
```

## Логирование

Логи сохраняются в следующие файлы:

- `error.log` - только ошибки
- `combined.log` - все логи

В development режиме логи также выводятся в консоль.

## Безопасность

- Rate limiting: максимум 100 запросов за 15 минут
- Валидация email адресов (если email указан)
- HTTPS шифрование
- CORS защита

## Лицензия

ISC
