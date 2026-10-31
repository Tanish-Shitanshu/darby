# Darby in one container: the server, the test pages, a headless Chromium and the built UI. Used by a Docker host such as Render.
# Local check:  docker build -t darby . && docker run -p 7860:7860 -e DARBY_BASIC_AUTH=judge:pass darby
FROM node:22-bookworm-slim
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY . /app
RUN npm ci \
 && npx playwright install --with-deps chromium \
 && npm run build -w @darby/companion \
 && mkdir -p /app/.darby /app/workspace \
 && rm -rf /var/lib/apt/lists/* /root/.npm \
 && chown -R node:node /app /ms-playwright

USER node
# A host that sets PORT (Render does) overrides this default.
ENV PORT=7860 \
    FIXTURE_PORT=4010 \
    DARBY_HEADLESS=1 \
    BROWSER_CHANNEL=chromium \
    DARBY_STATIC_DIR=/app/apps/companion/dist \
    DARBY_FIXTURE_PROXY=1 \
    DARBY_DIR=/app/.darby
EXPOSE 7860
CMD ["sh", "-c", "node fixtures/site/server.mjs & exec npx tsx apps/server/src/index.ts"]
