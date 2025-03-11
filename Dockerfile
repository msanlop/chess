FROM node:21-alpine AS build
#dependencies not in alpine
RUN apk add g++ make py3-pip

RUN mkdir -p /home/node/chess/client/node_modules
#client build target
RUN mkdir -p /home/node/chess/server/out/public/static
RUN chown -R node:node /home/node/chess/

#build client
WORKDIR /home/node/chess/client
COPY --chown=node:node ./client/package*.json ./
USER node
RUN npm install --omit=dev
COPY --chown=node:node ./client .
RUN npm run build

#build server
RUN mkdir -p /home/node/chess/server/node_modules && chown -R node:node /home/node/chess/server
WORKDIR /home/node/chess/server
COPY --chown=node:node ./server/package*.json ./
USER node
RUN npm install
COPY --chown=node:node ./server .
RUN npm run build

# remove dev dependencies from node_modules
RUN npm install --omit=dev


#copy server files and run
FROM node:21-alpine
WORKDIR /home/node/chess/server
COPY --from=build /home/node/chess/server/package.json ./
COPY --from=build /home/node/chess/server/node_modules ./node_modules
COPY --from=build /home/node/chess/server/out ./out
RUN npm install --omit=dev
EXPOSE 8080
CMD [ "node" , "out/index.js" ]
