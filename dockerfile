# FROM alpine:latest 
# RUN apk add --no-cache  --update nodejs npm yarn git

FROM heguangda0921/apline-node-18-v1:latest
# RUN mkdir -p /home/ReconciliationSystem
WORKDIR /home
RUN git clone https://github.com/Orbiter-Finance/ReconciliationSystem.git
WORKDIR /home/ReconciliationSystem
RUN git checkout -b devlop origin/devlop
RUN git pull
RUN npm install -g ts-node
RUN npm install -g typescript
# COPY ./src ./src
COPY ./env.ts ./src/config/env.ts
COPY ./public ./public
RUN yarn config set ignore-engines true
RUN yarn global add pm2
RUN yarn --network-timeout 600000
RUN tsc
# RUN run build
EXPOSE 3000
CMD ["pm2-runtime","./dist/app.js"]
