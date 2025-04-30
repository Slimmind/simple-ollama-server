require('dotenv').config();
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const https = require('https');
const fs = require('fs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const winston = require('winston');
const validator = require('validator');

const app = express();
const port = process.env.PORT || 3000;

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

// SSL сертификаты
let options;
try {
	options = {
		key: fs.readFileSync(process.env.SSL_KEY_PATH),
		cert: fs.readFileSync(process.env.SSL_CERT_PATH),
	};
} catch (error) {
	logger.error('Ошибка при чтении SSL сертификатов:', error);
	process.exit(1);
}

// Настройка nodemailer (только если есть email конфигурация)
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

// Валидация email
const validateEmail = (email) => {
	return validator.isEmail(email);
};

app.post('/ask', async (req, res) => {
	const { model, prompt, email } = req.body;

	if (!model) {
		return res.status(400).json({ error: 'Model is required' });
	}

	if (!prompt) {
		return res.status(400).json({ error: 'Prompt is required' });
	}

	if (email && !validateEmail(email)) {
		return res.status(400).json({ error: 'Invalid email format' });
	}

	try {
		logger.info('Sending request to Ollama:', { model, prompt });

		const response = await axios.post('http://127.0.0.1:11434/api/generate', {
			model: model,
			prompt: prompt,
			stream: false,
		});

		logger.info('Received response from Ollama:', response.data);

		const ollamaResponse = response.data.response;

		// Отправка email только если указан email и настроен transporter
		if (email && transporter) {
			const mailOptions = {
				from: process.env.EMAIL_USER,
				to: email,
				subject: 'Response from Ollama Server',
				text: `Your prompt: ${prompt}\nResponse: ${ollamaResponse}`,
			};

			await transporter.sendMail(mailOptions);
			logger.info(`Email sent to ${email}`);

			return res.json({
				response: ollamaResponse,
				message: 'Response sent to your email',
			});
		}

		// Если email не указан или transporter не настроен
		return res.json({
			response: ollamaResponse,
		});
	} catch (error) {
		logger.error('Error:', error);
		res.status(500).json({
			error: 'Failed to process request' + (email ? ' or send email' : ''),
		});
	}
});

// Graceful shutdown
process.on('SIGTERM', () => {
	logger.info('SIGTERM received. Shutting down gracefully');
	server.close(() => {
		logger.info('Process terminated');
		process.exit(0);
	});
});

let server;
if (options.key && options.cert) {
	server = https.createServer(options, app);
	logger.info('HTTPS server created');
} else {
	server = http.createServer(app);
	logger.warn('HTTP server created (no SSL certificates found)');
}

server.listen(port, () => {
	logger.info(`Server is running :)`);
});
