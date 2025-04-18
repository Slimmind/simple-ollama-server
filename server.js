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
		key: fs.readFileSync('./private.key'),
		cert: fs.readFileSync('./certificate.crt'),
	};
} catch (error) {
	logger.error('Ошибка при чтении SSL сертификатов:', error);
	process.exit(1);
}

// Настройка nodemailer
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

// Middleware
app.use(cors());
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

	if (!email || !validateEmail(email)) {
		return res.status(400).json({ error: 'Valid email is required' });
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

		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: email,
			subject: 'Response from Ollama Server',
			text: `Your prompt: ${prompt}\nResponse: ${ollamaResponse}`,
		};

		await transporter.sendMail(mailOptions);
		logger.info(`Email sent to ${email}`);

		res.json({
			response: ollamaResponse,
			message: 'Response sent to your email',
		});
	} catch (error) {
		logger.error('Error:', error);
		res.status(500).json({ error: 'Failed to process request or send email' });
	}
});

const server = https.createServer(options, app);

// Graceful shutdown
process.on('SIGTERM', () => {
	logger.info('SIGTERM received. Shutting down gracefully');
	server.close(() => {
		logger.info('Process terminated');
		process.exit(0);
	});
});

server.listen(port, () => {
	logger.info(`Server is running on https://localhost:${port}`);
});
