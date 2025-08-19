 # 5 min project — T3 Chat Clone

 Minimal, Netlify-ready chat clone inspired by T3 Chat. Static frontend + a single serverless function, with optional persistence via Upstash Redis.

 ## Features
 - Static HTML/CSS/JS frontend
 - Serverless API at `/api/messages`
 - Upstash Redis persistence when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
 - Ephemeral in-memory fallback when not set

 ## Local dev (optional)
 1. Install deps:
    ```bash
    npm install
    ```
 2. (Optional) set env vars in a `.env` file or your shell:
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`
 3. Run locally with Netlify Dev:
    ```bash
    npx netlify-cli@latest dev
    ```

 ## Deploy to Netlify
 1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket)
 2. In Netlify, create a New site from Git and pick your repo
 3. No build command needed; publish directory is `.` (configured in `netlify.toml`)
 4. In Site settings → Environment variables, add (optional for persistence):
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`
 5. Deploy. Your API will be available at `/api/messages`

 ## API
 - `GET /api/messages` → `{ messages: Message[] }`
 - `POST /api/messages` with JSON `{ author?: string, text: string }` → `{ message: Message }`

 ```ts
 type Message = {
   id: string;
   text: string;
   author: string;
   timestamp: number; // ms since epoch
 }
 ```

 ## Notes
 - Without Upstash, messages are stored in-memory per function instance and may disappear on cold starts.
 - Keep messages small; serverless functions have size/time limits.
 - Customize the UI in `index.html`.


