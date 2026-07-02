const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем запуск бинарника внутри контейнера Render
exec('chmod +x ./opera-proxy.linux-amd64', (err) => {
    if (err) console.error('Не удалось выдать права бинарнику:', err);
    else console.log('Права на запуск бинарника успешно выданы.');
});

app.get('/get-config', (req, res) => {
    console.log('Получен запрос на генерацию конфига. Обращаюсь к API Opera...');
    
    // Запускаем линуксовый бинарник для вывода списка прокси
    exec('./opera-proxy.linux-amd64 -country EU -list-proxies', (error, stdout, stderr) => {
        if (error) {
            console.error(`Ошибка при работе утилиты: ${error.message}`);
            res.status(500).send(`Ошибка генерации на стороне сервера: ${error.message}`);
            return;
        }
        
        // Устанавливаем заголовки, чтобы твой Мак понял, что это CSV-файл
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="proxies.csv"');
        
        // Отправляем сгенерированные данные обратно на Мак
        res.send(stdout);
        console.log('Конфиг успешно сгенерирован и отправлен клиенту.');
    });
});

app.listen(PORT, () => {
    console.log(`Сервер воркера запущен на порту ${PORT}`);
});