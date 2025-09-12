FROM node:lts

WORKDIR /app

COPY . /app

VOLUME [ "/app/data" ]

RUN npm install && npm run build

EXPOSE 5000

CMD ["sh", "-c", "npx drizzle-kit migrate && npm start"]
