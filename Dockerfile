# Docker image: innou/deployer
# The image runs the http-server serving the page that deploys the InnCrowdsale contract
#
# Usage:
# docker build --tag innou/deployer .
# docker run --name inn-deploy --rm -p 127.0.0.1:8087:8087/tcp innou/deployer
# #then navigate your browser to http://localhost:8087

# Step 1: prepare the node.js iamge
FROM node:11 as Base

RUN apt update && apt install -y netcat
RUN mkdir -p /home/node/app && \
       chown node:node -R /home/node/app

# Step 2: compile the smart contracts and run tests
FROM Base as Builder
ENV HOME=/home/node
WORKDIR /home/node/app

COPY --chown=node:node ./package.json .
USER node
RUN npm install

COPY --chown=node:node . .
RUN npm run test \
    && npm run build:clean \
    && npm run build

# Step 3: build the final image
FROM Base
ARG HTTP_PORT=8087

USER node
ENV HOME=/home/node
ENV NODE_ENV=production
ENV HTTP_PORT=$HTTP_PORT
WORKDIR /home/node/app

COPY --chown=node:node ./deployment/ ./
COPY --from=Builder /home/node/app/build/ ./public/build/
COPY --from=Builder /home/node/app/_contracts/flatten/ ./public/_contracts/

RUN npm install

# Expose the port
EXPOSE $HTTP_PORT

# Start the http-server listening on the port
ENTRYPOINT ["sh", "-c", "exec node ./node_modules/.bin/http-server -p $HTTP_PORT"]
