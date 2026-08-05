docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t dailybruin/crossword:backend --push . \
&& kubectl apply -f crossword-backend-dply.yaml \
&& kubectl rollout restart deployment/crossword-backend \
&& kubectl rollout status deployment/crossword-backend