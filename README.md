# Duck Sprint Selector

Node + TypeScript app with a small UI that:
- picks a random duck breed from `duck_breeds.txt`
- fetches a duck image
- asks OpenRouter for a short duck description

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (copy `.env.example` to `.env`):

```bash
cp .env.example .env
```

Required variables:
- `OPENROUTER_API_KEY` (or `VITE_OPENROUTER_API_KEY`)
- `OPENROUTER_MODEL` (or `VITE_OPENROUTER_MODEL`)

## Run

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
npm start
```

Then open `http://localhost:3000`.
