# Use a imagem base do Node.js
FROM node:18

# Defina o diretório de trabalho
WORKDIR /app

# Copie os arquivos de dependência
COPY package.json package-lock.json ./

# Instale as dependências
RUN npm install

# Copie o restante dos arquivos da aplicação
COPY . .

# Construa o aplicativo Next.js
RUN npm run build

# Exponha a porta que o Next.js usa (3000)
EXPOSE 3000

# Inicie o aplicativo
CMD ["npm", "start"]
