# Custom ngrok image — downloads the official binary into a clean Debian base to avoid
# the containerd "openat etc/passwd: path escapes from parent" bug caused by the
# Nix-based official ngrok/ngrok images on Docker Desktop's containerd runtime.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates unzip && \
    curl -Lo /tmp/ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip && \
    unzip /tmp/ngrok.zip -d /usr/local/bin && \
    rm /tmp/ngrok.zip && \
    apt-get remove -y curl unzip && apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["ngrok"]
