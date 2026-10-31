# Skiup

Skiup is a React + Vite social app for skiers and snowboarders. Rider accounts, profiles, clips, follows, comments, reports, blocks, and private clip shares use Supabase. The original rider posts and resort cards are clearly sample content; live community clips and rider profiles appear after the database setup is applied.

## Run locally

```powershell
npm install
npm run dev
```

## Set up Supabase

1. In Supabase **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql) to create the account, profile, post, and storage foundations. If those are already installed, do not rerun it.
2. Then run [`supabase/migrations/20261030_social_features.sql`](./supabase/migrations/20261030_social_features.sql). It adds private profile preferences, location coordinates, likes, follows and follow requests, comments, private clip shares, reports, blocks, counts, and their Row Level Security policies. It also moves email notification preferences out of publicly discoverable profiles.
3. Then run [`supabase/migrations/20261031_creator_analytics.sql`](./supabase/migrations/20261031_creator_analytics.sql) to enable private creator analytics. It must be run after the social features migration.
4. In **Authentication → URL Configuration**, set the local Site URL to the local address you use and add both `http://localhost:5173/**` and `http://127.0.0.1:5173/**` to the redirect URLs. Add the deployed app's origin and redirect URLs before production.
5. Confirm email delivery is configured in **Authentication → Providers → Email**. Signup requires email confirmation when that option is enabled; password recovery uses the same configured email provider.
6. The local project URL and publishable key are in `.env.local`, which is ignored by Git. For another environment, copy `.env.example` to `.env.local` and add that environment's Supabase project URL and **publishable** key. Never put a service-role key in the frontend.
7. Restart Vite after changing environment variables.

If the app reports that `public.post_likes` is missing, run the social features migration in step 2; `schema.sql` alone does not create social tables. If the app reports `JWT expired`, sign out and back in so Supabase can issue a fresh session.

If the social features migration stops with a duplicate-policy error, use the updated migration file and rerun the entire script in the SQL Editor. Its policies are dropped before being recreated, so rerunning after a partial execution is safe.

Riders can sign up and sign in with email/password, confirm their email, request password resets, change their email or password, customize their name, username, bio, riding discipline, location, profile photo, and cover image, and manage profile visibility and email preferences. Location suggestions and the mountain search use OpenStreetMap's public Nominatim/Overpass services; forecasts use Open-Meteo. These services require no API keys. Mountain weather and snowfall are model estimates, not official resort reports; live lift/opening status is not shown when a source is unavailable. Public geocoding and map endpoints are rate-limited and best-effort; for a production-scale deployment, use a managed provider or host a compliant geocoding/Overpass service.

Signed-in riders can upload MP4, MOV, M4V, or WebM clips up to 50 MB, record a clip using their device camera, add captions and typed locations, and delete their own clips. Clips are stored privately and served through short-lived signed URLs. Following feeds, counts, comments, private shares, and follow requests are persisted in Supabase. Creator analytics show stored clip, like, comment, and follower totals plus daily engagement; Skiup does not currently collect video views. Riders can report and block accounts; row-level security prevents blocked accounts from following, commenting, sharing, or viewing each other's posts. Do not treat browser MIME checks as malware scanning; a production upload pipeline that needs content moderation or codec inspection should add a trusted server-side processing service.
