# rainman

Rainman is the knowledge expert and query agent in this monorepo.

## Current state

This package contains the runnable Rainman service:

- TypeScript/Node.js API service
- `/healthz`, `/readyz`, and `POST /v1/query`
- KB-safe markdown tooling and response validation modules
- shallow bootstrap KB under `./kb`
- Dockerfile
- Helm chart under `./helm/kb-agent`

The service runs through a Pi session with OpenRouter-backed model calls. A valid `OPENROUTER_API_KEY` is required for successful query execution.

## Workspace usage

From the repo root:

```bash
npm install
npm run build:rainman
npm run dev:rainman
```

If you want to run commands from this directory after installing at the repo root, the local package scripts also work.

## Local development

From `agents/rainman`:

```bash
export OPENROUTER_API_KEY=your-real-openrouter-key
export MODEL_ID=openrouter/openai/gpt-5.4
export KB_ROOT=$(pwd)/kb
export PORT=3000
export LOG_LEVEL=info
npm run dev
```

Smoke test:

```bash
curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
curl -X POST http://127.0.0.1:3000/v1/query \
  -H 'content-type: application/json' \
  -d '{"question":"What are you?"}'
```

## Build

From the repo root:

```bash
npm run build:rainman
docker build -f ./agents/rainman/Dockerfile -t localhost/rainman:dev .
```

## Deploy to kind (`bc-local`)

Expected Kubernetes context:

```bash
kubectl config current-context
# kind-bc-local
```

From the repo root:

```bash
kind load docker-image localhost/rainman:dev --name bc-local
helm upgrade --install rainman ./agents/rainman/helm/kb-agent \
  -n rainman \
  -f ./agents/rainman/helm/kb-agent/values-kind.yaml \
  --kube-context kind-bc-local
kubectl --context kind-bc-local -n rainman rollout status deployment/kb-agent
helm test rainman -n rainman --kube-context kind-bc-local --logs
```

## KB volume behavior in Kubernetes

The chart supports a writable KB mount at `/app/kb` for future sidecar-based Git sync.

By default:
- the image contains a shallow bootstrap KB under `/app/bootstrap-kb`
- the Deployment mounts an `emptyDir` at `/app/kb`
- an init container seeds `/app/kb` from `/app/bootstrap-kb` if `_KB_INDEX.md` is missing
- future sidecars can mount the same `kb-data` volume and populate additional markdown content

Relevant values are under `kb:` in `./helm/kb-agent/values.yaml`.

Uninstall:

```bash
helm uninstall rainman -n rainman --kube-context kind-bc-local
```
