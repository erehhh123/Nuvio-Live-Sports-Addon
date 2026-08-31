FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
ENV PORT=7000
EXPOSE 7000
CMD ["npm", "start"]
