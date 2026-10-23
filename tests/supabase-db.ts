// Keyrir migrations og seed í PGlite (Postgres í minni) með lágmarks eftirlíkingu af Supabase.
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "supabase");

export async function createTestDb() {
  const db = new PGlite({ extensions: { pg_trgm } });

  await db.exec(`
    create schema extensions;
    create role anon; create role authenticated;
    grant usage on schema public, extensions to anon, authenticated;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
    alter table storage.objects enable row level security;
    create publication supabase_realtime;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
  `);

  const migrations = join(ROOT, "migrations");
  for (const f of readdirSync(migrations).sort()) {
    await db.exec(readFileSync(join(migrations, f), "utf8"));
  }
  await db.exec(readFileSync(join(ROOT, "seed.sql"), "utf8"));

  async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await db.query<T>(sql, params)).rows;
  }

  // Keyra sem tiltekinn notandi (RLS gildir) eða nafnlaus; asAdmin sleppir RLS
  async function as(uid: string | null) {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
    await db.exec(uid ? "set role authenticated" : "set role anon");
  }
  async function asAdmin() {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }

  async function createUser(email: string | null) {
    await asAdmin();
    const [u] = await q<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [email]);
    return u.id;
  }

  return { db, q, as, asAdmin, createUser };
}
