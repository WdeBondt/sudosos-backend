# Build in a different image to keep the target image clean
FROM node:14-alpine as build
WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY ./ ./
RUN npm run build \
 && npm run swagger

# The target image that will be run
FROM node:14-alpine as target

RUN apk add openssl

WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm install --production

COPY --from=build --chown=node /app/init_scripts /app/init_scripts
RUN sh /app/init_scripts/00_make_sudosos_data_dirs.sh
RUN sh /app/init_scripts/00_regen_sudosos_secrets.sh

COPY --from=build --chown=node /app/out/src /app/out/src
COPY --from=build --chown=node /app/out/swagger.json /app/out/swagger.json

CMD ["npm", "run", "serve"]
