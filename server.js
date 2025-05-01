require('dotenv').config();
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const http = require('http');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const winston = require('winston');
const validator = require('validator');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const emailTemplate = fs.readFileSync(
	path.join(__dirname, 'email-template.html'),
	'utf-8'
);

// Настройка логгера
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
		new winston.transports.File({ filename: 'combined.log' }),
	],
});

if (process.env.NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: winston.format.simple(),
		})
	);
}

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 минут
	max: 100, // максимум 100 запросов за 15 минут
});

// Настройка nodemailer
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
	transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS,
		},
	});
}

// Middleware
app.use(
	cors({
		origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
	})
);
app.use(express.json());
app.use(morgan('combined'));
app.use(limiter);

// Проверка доступности Ollama
async function checkOllama() {
	try {
		await axios.get('http://127.0.0.1:11434', { timeout: 3000 });
		logger.info('Ollama is available');
		return true;
	} catch (error) {
		logger.error('Ollama is not available:', error.message);
		return false;
	}
}

// Валидация email
const validateEmail = (email) => validator.isEmail(email);

// Роут /ask
app.post('/ask', async (req, res) => {
	const { model, prompt, email } = req.body;

	if (!model) return res.status(400).json({ error: 'Model is required' });
	if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
	if (email && !validateEmail(email)) {
		return res.status(400).json({ error: 'Invalid email format' });
	}

	try {
		const response = await axios.post(
			'http://127.0.0.1:11434/api/generate',
			{
				model,
				prompt,
				stream: false,
			},
			{ timeout: 1000000 }
		);

		const ollamaResponse = response.data.response;

		if (email && transporter) {
			// Заполнение шаблона
			const htmlEmail = emailTemplate
				.replace('{{prompt}}', prompt)
				.replace('{{response}}', ollamaResponse)
				.replace('{{date}}', new Date().toLocaleString());

			const mailOptions = {
				from: process.env.EMAIL_USER,
				to: email,
				subject: 'Ответ от Ollama Server',
				html: htmlEmail, // Важно: используем html вместо text
				text: `Ваш запрос: ${prompt}\nОтвет: ${ollamaResponse}`, // Fallback для почтовых клиентов
			};

			await transporter.sendMail(mailOptions);
			logger.info(`HTML email sent to ${email}`);

			return res.json({
				response: ollamaResponse,
				message: 'HTML response sent to your email',
			});
		}

		return res.json({ response: ollamaResponse });
	} catch (error) {
		logger.error('Error:', error);
		res.status(500).json({
			error: 'Internal server error',
			details: error.message,
		});
	}
});

// Создаем HTTP-сервер
const server = http.createServer(app);

// Graceful shutdown
process.on('SIGTERM', () => {
	logger.info('SIGTERM received. Shutting down gracefully');
	server.close(() => {
		logger.info('Process terminated');
		process.exit(0);
	});
});

// Запуск сервера с проверкой Ollama
async function startServer() {
	const isOllamaAvailable = await checkOllama();
	if (!isOllamaAvailable) {
		logger.error('Ollama is not available. Exiting...');
		process.exit(1);
	}

	server.listen(port, () => {
		logger.info(`HTTP server running on http://localhost:${port}`);
	});
}

startServer().catch((error) => {
	logger.error('Failed to start server:', error);
	process.exit(1);
});
