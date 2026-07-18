# Censai

**A self-hosted multiplayer canvas where people and persistent AI agents work in the same space.**

[![License: BUSL 1.1](https://img.shields.io/badge/License-BUSL%201.1-orange.svg)](LICENSE)
[![CI](https://github.com/oogalieboogalie/censai/actions/workflows/ci.yml/badge.svg)](https://github.com/oogalieboogalie/censai/actions/workflows/ci.yml)
[![Docker Ready](https://img.shields.io/badge/Docker-ready-blue.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![GitHub stars](https://img.shields.io/github/stars/oogalieboogalie/censai?style=social)](https://github.com/oogalieboogalie/censai/stargazers)

Censai replaces the stack of disconnected chat tabs, terminals, documents, task boards, and agent
dashboards with one shared infinite canvas. A teammate can move a document beside your terminal. An
agent can contribute to that document. Everyone stays oriented because the work, the people, and the
agents remain visible together.

![Censai Canvas Preview](public/preview.png)

## The core idea

Most AI products put one person in front of one chat box. Censai is built around a different unit:
the **shared workspace**.

- **People share a canvas**, not a screen recording. Presence, window positions, and durable canvas
  changes belong to the workspace.
- **Agents occupy the workspace too.** They can inspect authorized context, use equipped tools, run
  in the background, and—after the required approval—write into visible work surfaces.
- **The canvas preserves context.** Documents, terminals, tasks, files, chats, browsers, agents, and
  their relationships stay spatially arranged instead of disappearing into a transcript.
- **You own the runtime.** Run it on your workstation, home server, or private server with Docker.

## Multiplayer collaboration

The multiplayer beta proves the important vertical slice:

1. An owner invites a separately registered workspace member.
2. Both people see truthful live presence in the same workspace.
3. Window movement streams to the other client as a low-latency preview.
4. Durable changes are revision-checked, saved to PostgreSQL, and broadcast to every connected member.
5. An equipped agent can discover a writable canvas window, request approval, append content, and
   publish the committed result to both people.
6. Reconnecting restores the authoritative revision, while non-members are denied.

The current beta does **not** yet provide character-by-character collaborative text editing. Text is
shared after a durable workspace commit, so a teammate sees the result after the editor pauses rather
than on every keystroke. See [COLLABORATION.md](COLLABORATION.md) for the exact boundary and the path
to CRDT-backed live co-editing.

> **Release status:** the multiplayer vertical slice is implemented and under review in the current
> beta line. It is not part of the latest public image until that source and its scrubbed public export
> both pass review and merge. The release receipt identifies the exact commit in every published image.

## What else is inside

### Infinite canvas

- Pan, zoom, draw, group, resize, and arrange work across a persistent spatial surface.
- Connect agents to windows and organize related work into visual stations.
- Use 50+ manifest-registered window types, including documents, code, terminals, files, tasks,
  schedules, chats, browsers, images, media, agent design, and operational tools.
- Scaffold a new window with `npm run window:new` and validate it with `npm run window:validate`.

### Persistent agents

- Create agents with their own identity, role, model route, tools, and workspace-scoped permissions.
- Store weighted memories, knowledge-graph facts, and AES-256-GCM encrypted private journals.
- Run with Ollama locally or use OpenAI-compatible, OpenRouter, Gemini, and other configured providers.
- Queue background tasks and schedules that continue after the browser closes.
- Give different agents different tools instead of exposing every capability to every model.

### Self-hosted control

- PostgreSQL is the durable authority for workspace and agent state.
- Qdrant provides optional semantic recall and degrades gracefully when unavailable.
- Risky execution capabilities can be kept behind the optional runner boundary.
- Public releases pass tests, production build, window validation, secret scanning, dependency audit,
  malicious-code tripwires, and CodeQL before an immutable image is published.

## Quick start

```bash
git clone https://github.com/oogalieboogalie/censai.git
cd censai
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up -d
```

Open <http://localhost:3002>.

The GHCR override pulls the newest validated public image. To build the checked-out source instead:

```bash
docker compose up -d --build
```

For local models, install [Ollama](https://ollama.com/) and pull a tool-calling model plus the default
embedding model:

```bash
ollama pull qwen3-coder:latest
ollama pull nomic-embed-text
```

Read [SELF_HOSTING_GUIDE.md](SELF_HOSTING_GUIDE.md) before exposing a shared installation to other
people or the internet. The default Compose stack is intended for a trusted local machine.

## Releases you can reproduce

Every reviewed merge to public `main` must pass the public CI and security gates. A successful merge
publishes:

- an immutable `selfhost-<date>-<commit>` GitHub release;
- a matching `ghcr.io/oogalieboogalie/censai:<release-tag>` container;
- a release receipt tying the source commit to the image.

Use the immutable tag for a repeatable installation. `latest` is only a convenience pointer.

## Documentation

- [Collaboration model and live-text roadmap](COLLABORATION.md)
- [Self-hosting guide](SELF_HOSTING_GUIDE.md)
- [Architecture](ARCHITECTURE.md)
- [Window integration specification](docs/WINDOW_INTEGRATION_SPEC.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Project status

Censai is an active, founder-led beta. The canvas, agents, memory, tools, self-hosting, and release
pipeline are real; the multiplayer vertical slice is implemented in the beta line; character-level
co-editing and multi-node collaboration fan-out remain engineering work. Claims in this README are
kept narrower than the product ambition on purpose.

## License

[Business Source License 1.1](LICENSE). You may run Censai locally or self-host it inside your
organization, including for business use. You may not offer Censai itself to third parties as a
hosted or managed service. Each release converts to MIT four years after publication.
