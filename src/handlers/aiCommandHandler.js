const axios = require('axios');
const Config = require('../../config');

// Кэш для защиты от спама
const userCooldowns = new Map();
const COOLDOWN_TIME = 30000; // 30 секунд

module.exports = {
    aiCommandHandler: async function (rustplus, client, command) {
        const prefix = rustplus.generalSettings.prefix;
        const aiCommand = `${prefix}ai`;

        if (!command.startsWith(aiCommand)) {
            return false;
        }

        const question = command.substring(aiCommand.length).trim();
        if (!question) {
            rustplus.sendInGameMessage('Пожалуйста, задайте вопрос после команды !ai');
            return true;
        }

        // Проверка на спам
        const now = Date.now();
        const lastRequest = userCooldowns.get(client.steamId) || 0;
        if (now - lastRequest < COOLDOWN_TIME) {
            const remainingTime = Math.ceil((COOLDOWN_TIME - (now - lastRequest)) / 1000);
            rustplus.sendInGameMessage(`Пожалуйста, подождите ${remainingTime} секунд перед следующим запросом.`);
            return true;
        }

        // Проверка длины вопроса
        if (question.length > 500) {
            rustplus.sendInGameMessage('Ваш вопрос слишком длинный. Максимальная длина - 500 символов.');
            return true;
        }

        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'deepseek/deepseek-chat',
                messages: [{
                    role: 'user',
                    content: question
                }],
                temperature: 0.7,
                max_tokens: 2000
            }, {
                headers: {
                    'Authorization': `Bearer ${Config.general.openRouterApiKey}`,
                    'HTTP-Referer': 'https://github.com/alexemanuelol/rustplusplus',
                    'X-Title': 'RustPlusPlus',
                    'Content-Type': 'application/json'
                }
            });

            const answer = response.data.choices[0].message.content;
            
            // Разбиваем длинный ответ на части
            if (answer.length > 200) {
                const chunks = answer.match(/.{1,200}(?:\s|$)/g);
                for (const chunk of chunks) {
                    rustplus.sendInGameMessage(chunk.trim());
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Задержка между сообщениями
                }
            } else {
                rustplus.sendInGameMessage(answer);
            }

            // Обновляем время последнего запроса
            userCooldowns.set(client.steamId, now);
        } catch (error) {
            console.error('AI Command Error:', error.response?.data || error.message);
            let errorMessage = 'Ошибка при обработке запроса.';
            
            if (error.code === 'ENOTFOUND') {
                errorMessage = 'Ошибка подключения к серверу. Проверьте интернет-соединение.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Ошибка авторизации API. Пожалуйста, проверьте API ключ в конфигурации.';
            } else if (error.response?.status === 404) {
                errorMessage = 'API эндпоинт не найден.';
            } else if (error.response?.status === 429) {
                errorMessage = 'Слишком много запросов. Пожалуйста, подождите.';
            } else if (error.response?.data?.error?.code === 'unsupported_country_region_territory') {
                errorMessage = 'Ваш регион не поддерживается. Пожалуйста, используйте VPN.';
            }
            
            rustplus.sendInGameMessage(errorMessage);
        }

        return true;
    }
}; 