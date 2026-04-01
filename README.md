# rainman

Rainman is a correctness-first markdown knowledge base query service.

## Current state

This repository now contains the initial project scaffold described by `codebase.md` and `design.md`:

- TypeScript/Node.js API service
- `/healthz`, `/readyz`, and `POST /v1/query`
- KB-safe markdown tooling and response validation modules
- sample markdown KB under `./kb`
- Dockerfile
- Helm chart under `./helm/kb-agent`
- kind-focused values for the `bc-local` cluster

The service now runs through a real Pi session with OpenRouter-backed model calls. A valid `OPENROUTER_API_KEY` is required for successful query execution.

## Local development

Install dependencies:

```bash
npm install
```

Run locally:

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

```bash
npm run build
docker build -t localhost/rainman:dev .
```

## Deploy to kind (`bc-local`)

Expected Kubernetes context:

```bash
kubectl config current-context
# kind-bc-local
```

Load the local image into kind and deploy with Helm:

```bash
kind load docker-image localhost/rainman:dev --name bc-local
helm upgrade --install rainman ./helm/kb-agent \
  -f ./helm/kb-agent/values-kind.yaml \
  --kube-context kind-bc-local
kubectl --context kind-bc-local rollout status deployment/kb-agent
helm test rainman --kube-context kind-bc-local --logs
```

## KB volume behavior in Kubernetes

The chart now supports a writable KB mount at `/app/kb` for future sidecar-based Git sync.

By default:
- the image contains a shallow bootstrap KB under `/app/bootstrap-kb`
- the Deployment mounts an `emptyDir` at `/app/kb`
- an init container seeds `/app/kb` from `/app/bootstrap-kb` if `_KB_INDEX.md` is missing
- future sidecars can mount the same `kb-data` volume and populate additional markdown content

Relevant values are under `kb:` in `helm/kb-agent/values.yaml`.

Uninstall:

```bash
helm uninstall rainman --kube-context kind-bc-local
```
