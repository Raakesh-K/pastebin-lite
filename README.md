## 🚀 How to Run the App Locally

### 1. Clone the Repository

```bash
git clone https://github.com/Raakesh-K/pastebin-lite.git
cd pastebin-lite
npm install
```
2. Install Dependencies
npm install
```
```
3.Configure Environment Variables
DATABASE_URL=your_postgresql_connection_string
BASE_URL=http://localhost:3000
Health check:

http://localhost:3000/api/healthz


4. Start the Application
npm run dev

5 Persistence Layer

This application uses:

Database: PostgreSQL

Provider: Neon (serverless PostgreSQL)

pastes Table Structure
Column	Description
id	Unique paste ID
code	Paste content
ttl	Time-to-live in seconds
views	Current views

6 Important Design Decisions

Backend runs as serverless functions on Vercel

TTL enforced using created_at + ttl

View limits enforced using max_views

View count increments on each access

JSON-based API responses

Health check endpoint for automated testing

7 Deployed Application
https://pastebin-lite-psi-ruby.vercel.app

8 
---

Now save as **README.md**, then run:

```bash
git add README.md
git commit -m "Add project README"
git push

max_views	Maximum allowed views
created_at	Creation timestamp
