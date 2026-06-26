# RUNBOOK

## Local
1. `npm install`
2. (optional) `cp .env.example .env.local` and set `GEMINI_API_KEY`
3. `npm run dev`
4. `curl localhost:3000/health` -> `{"status":"ok"}`
5. `curl -X POST localhost:3000/analyze-ticket -H 'content-type: application/json' -d @samples/request.json`

## Tests
`npm test`

## Deploy (Vercel)
1. Push this repo to GitHub; import into Vercel.
2. Set Production env vars: `GEMINI_API_KEY`, `MODEL_NAME=gemini-2.5-flash`.
3. Set Function Region to `sin1`.
4. After deploy: `curl https://<deployment>/health` and POST a sample to `/analyze-ticket`.