FROM node:10-alpine
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
USER node
RUN npm install > npm_install.log 2>&1 || cat npm_install.log
COPY --chown=node:node . .
EXPOSE 8080
CMD [ "npm" , "start" ]