FROM nginx:alpine
# Копируем наш конфиг
COPY nginx.conf /etc/nginx/nginx.conf
# Railway задаёт порт через переменную $PORT.
# Заменяем порт 3000 в конфиге на тот, который требует Railway при старте.
CMD sed -i -e 's/listen 3000/listen '"$PORT"'/g' /etc/nginx/nginx.conf && nginx -g 'daemon off;'