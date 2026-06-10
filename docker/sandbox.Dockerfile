# Homebase agent/user sandbox image.
# A portable Linux toolchain that the in-app terminal and agent shell run
# inside. One container per project; the project is bind-mounted at /workspace.
# Build:  docker build -f docker/sandbox.Dockerfile -t homebase-sandbox:latest .
# (The server also builds this automatically on first use.)
FROM node:20-bookworm-slim

# Common build/dev tooling agents and users expect in a working shell.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git \
      curl \
      ca-certificates \
      python3 \
      python3-pip \
      build-essential \
      ripgrep \
      jq \
      less \
      procps \
      openssh-client \
 && rm -rf /var/lib/apt/lists/*

# A friendly default prompt and a stable working directory.
ENV TERM=xterm-256color
WORKDIR /workspace

# Keep the container alive; the server execs shells/commands into it on demand.
CMD ["sleep", "infinity"]
