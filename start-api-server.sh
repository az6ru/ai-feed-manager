#!/bin/bash

# Запускаем API-сервер для XML-фидов
cd $(dirname $0)/project
echo "Запуск API-сервера для XML-фидов..."
node api-server.js


