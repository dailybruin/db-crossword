docker buildx build --no-cache --platform linux/amd64,linux/arm64 --build-arg VITE_BACKEND_DOMAIN="https://crossword.dailybruin.com" -t dailybruin/crossword:frontend --push . \
&& kubectl rollout restart deployment/crossword-frontend \
&& kubectl rollout status deployment/crossword-frontend