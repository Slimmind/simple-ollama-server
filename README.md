# Simple Ollama Server

Простой сервер для работы с Ollama API, который отправляет ответы на указанный email адрес.

## Возможности

- Интеграция с Ollama API
- Отправка ответов на email
- Защита от DDoS-атак (rate limiting)
- Структурированное логирование
- CORS поддержка
- Graceful shutdown
- Валидация email адресов
- HTTPS поддержка

## Требования

- Node.js (версия 14 или выше)
- Ollama (должен быть запущен локально на порту 11434)
- SSL сертификаты (private.key и certificate.crt)
- Gmail аккаунт для отправки email

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
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
PORT=3000
NODE_ENV=development
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

Отправляет запрос к Ollama API и отправляет ответ на указанный email.

**Параметры запроса:**

```json
{
	"model": "llama2",
	"prompt": "Your question here",
	"email": "recipient@example.com"
}
```

**Успешный ответ:**

```json
{
	"response": "Response from Ollama",
	"message": "Response sent to your email"
}
```

## Логирование

Логи сохраняются в следующие файлы:

- `error.log` - только ошибки
- `combined.log` - все логи

В development режиме логи также выводятся в консоль.

## Безопасность

- Rate limiting: максимум 100 запросов за 15 минут
- Валидация email адресов
- HTTPS шифрование
- CORS защита

## Лицензия

ISC
