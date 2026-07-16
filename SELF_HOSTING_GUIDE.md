# Self-hosting Censai

Censai's public edition runs on your hardware. The project publishes source, a validated container
image, Postgres, and Qdrant configuration; it does not require a Censai-operated cloud account.
You supply the machine and, if desired, your own model-provider keys.

## Requirements

- Docker Desktop or Docker Engine with Compose
- Git for source-based installs
- Optional: Ollama on the host for local models

## Install

```bash
git clone https://github.com/oogalieboogalie/censai.git
cd censai
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d
```

Open <http://localhost:3002>. The GHCR override pulls the latest container that passed public CI.
For a reproducible deployment, replace `latest` in `docker-compose.ghcr.yml` with the immutable
image tag attached to a GitHub release.

To build the checked-out source instead:

```bash
docker compose up -d --build
```

## Models

For local inference, install Ollama on the Docker host and pull a tool-calling model plus the
embedding model:

```bash
ollama pull qwen3-coder:latest
ollama pull nomic-embed-text
```

Set `AI_MODEL=qwen3-coder:latest` in `.env`. Docker reaches the host through
`host.docker.internal`. You can instead place provider keys in `.env`; those requests and costs
belong to your provider account.

## Shared or internet-facing installs

The default Compose file is intended for a trusted local machine. Before allowing other people or
the public internet to connect:

1. Set independent random values of at least 32 characters for `SESSION_SECRET`,
   `JOURNAL_SECRET`, `CENSAI_VAULT_SECRET`, and `RUNNER_SECRET`.
2. Set `CENSAI_MODE=private_server` and set `APP_ORIGIN` and `GOOGLE_REDIRECT_URI` to the actual
   HTTPS origin.
3. Put the app behind a TLS reverse proxy and do not expose Postgres, Qdrant, or the runner ports
   to the public internet.
4. Leave the runner profile disabled unless you explicitly need agent code execution and have
   reviewed its Docker-socket access.

## Update

```bash
git pull --ff-only
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d
```

The named Docker volumes hold Postgres, Qdrant, and application state across container updates.
Back up those volumes before database or major-version changes.

## Release receipts

Every validated merge to public `main` creates:

- an immutable `selfhost-<date>-<commit>` GitHub release;
- matching `ghcr.io/oogalieboogalie/censai` release and commit tags;
- a `censai-self-host-release.txt` asset tying the source commit to the image name.

Use the immutable tag when you need repeatable deployments. `latest` is only a convenience pointer.
