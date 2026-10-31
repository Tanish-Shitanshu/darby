# Darby on a free Hugging Face Space (Docker). One container: the server, the test pages, a headless Chromium, and the built UI.
#
# On Hugging Face this file sits next to README.md and pulls the code from GitHub at build time (SRC_STAGE=gitsrc).
# To test it on your own machine from a checkout, build with the local files instead:
#   docker build -f deploy/huggingface/Dockerfile --build-arg SRC_STAGE=localsrc -t darby-space .
ARG SRC_STAGE=gitsrc

FROM alpine/git AS gitsrc
ARG REPO=https://github.com/Tanish-Shitanshu/darby
ARG REF=main
RUN git clone --depth 1 --branch "$REF" "$REPO" /src

FROM scratch AS localsrc
COPY . /src

FROM ${SRC_STAGE} AS src

FROM node:22-bookworm-slim
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY --from=src /src /app
RUN npm ci \
 && npx playwright install --with-deps chromium \
 && npm run build -w @darby/companion \
 && rm -rf /var/lib/apt/lists/* /root/.npm \
 && chown -R node:node /app /ms-playwright

# Hugging Face runs the container as user 1000 (the "node" user) and sends traffic to port 7860.
USER node
ENV PORT=7860 \
    FIXTURE_PORT=4010 \
    DARBY_HEADLESS=1 \
    BROWSER_CHANNEL=chromium \
    DARBY_STATIC_DIR=/app/apps/companion/dist \
    DARBY_FIXTURE_PROXY=1 \
    DARBY_DIR=/app/.darby
EXPOSE 7860
CMD ["sh", "-c", "node fixtures/site/server.mjs & exec npx tsx apps/server/src/index.ts"]
