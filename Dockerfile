FROM node:14.21.3
WORKDIR /usr/src/app

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 10005

CMD [ "npm", "run", "start" ]
