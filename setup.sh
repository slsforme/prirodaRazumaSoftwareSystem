#!/bin/bash
set -e  

sudo apt-get update -qq && \
sudo apt-get upgrade -y -qq

# Установка зависимостей для Docker
sudo apt-get install -y -qq \
    ca-certificates \
    curl \
    gnupg \
    git

# Добавление Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings && \
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Добавление Docker репозитория
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Обновление репозиториев
sudo apt-get update -qq

# Установка Docker и docker-compose 
sudo apt-get install -y -qq \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \

# Проверка установки
sudo docker --version