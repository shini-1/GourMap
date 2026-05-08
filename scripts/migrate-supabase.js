#!/usr/bin/env node
/**
 * One-time Supabase migration script — with auth user migration
 *
 * OLD project: dvkpflctotjavgrvbgay.supabase.co
 * NEW project: hiioeustuvxgyoezweyp.supabase.co
 *
 * Usage:  node scripts/migrate-supabase.js
 *
 * Strategy:
 *   1. Copy all auth users from old → new (preserving UUIDs)
 *      This satisfies all FK constraints (uid_fkey, owner_id_fkey, etc.)
 *   2. Migrate profile tables: business_owners, admins
 *   3. Migrate restaurants (FK → business_owners.uid / auth.users)
 *   4. Migrate menu_items (FK → restaurants.id)
 *   5. Migrate restaurant_device_ratings (FK → restaurants.id)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const OLD_URL = 'https://dvkpflctotjavgrvbgay.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NjAxNCwiZXhwIjoyMDc4MDcyMDE0fQ.J6dm0Lm11pNVMvwLkwf94VKaWqymsP1SdpA8-g7khH0';

const NEW_URL = 'https://hiioeustuvxgyoezweyp.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaW9ldXN0dXZ4Z3lvZXp3ZXlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAyNDg4NywiZXhwIjoyMDkyNjAwODg3fQ.QqSRzkih07uy1kEdrqmnlA2oy257Ki5-JqQjxftnm6c';

const BATCH_SIZE = 500;

const oldDb = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newDb = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// ── Step 1: Migrate auth users ────────────────────────────────────────────────

async function fetchOldAuthUsers() {
  const allUsers = [];
  let page = 1;
  while (true) {
    const { data, error } = await oldDb.auth.admin.listUsers({ perPage: 100, page });
    if (error) throw new Error('Failed to list old auth users: ' + error.message);
    if (!data.users || data.users.length === 0) break;
    allUsers.push(...data.users);
    if (data.users.length < 100) break;
    page++;
  }
  return allUsers;
}

async function createAuthUserInNew(user) {
  // Check if user already exists in new project
  const { data: existing } = await newDb.auth.admin.getUserById(user.id);
  if (existing?.user) return { created: false };

  // Recreate the user with the same UUID using admin API
  const { data, error } = await newDb.auth.admin.createUser({
    id:              user.id,           // preserve original UUID
    email:           user.email,
    email_confirm:   true,              // mark as confirmed so they can log in
    phone:           user.phone || undefined,
    user_metadata:   user.user_metadata || {},
    app_metadata:    user.app_metadata  || {},
    // We cannot migrate passwords — users will need to reset
    // Set a random placeholder password; they must use "Forgot Password" to regain access
    password:        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'Aa1!',
  });

  if (error) {
    // If user already exists (race condition), that's fine
    if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
      return { created: false };
    }
    throw new Error(`Failed to create auth user ${user.email}: ${error.message}`);
  }

  return { created: true };
}

async function migrateAuthUsers() {
  console.log('👤 Migrating auth users...');
  const users = await fetchOldAuthUsers();
  console.log(`  📥 ${users.length} auth users found in old project`);

  let created = 0;
  let skipped = 0;
  let failed  = 0;

  for (const user of users) {
    try {
      const { created: wasCreated } = await createAuthUserInNew(user);
      if (wasCreated) {
        created++;
        console.log(`  ✓ Created: ${user.email} (${user.id})`);
      } else {
        skipped++;
        console.log(`  ⏭  Already exists: ${user.email}`);
      }
    } catch (err) {
      failed++;
      console.error(`  ❌ Failed: ${user.email} — ${err.message}`);
    }
  }

  console.log(`  ✅ Auth users: ${created} created, ${skipped} already existed, ${failed} failed`);
  console.log('');

  if (failed > 0) {
    throw new Error(`${failed} auth user(s) failed to migrate. Cannot continue safely.`);
  }

  return users;
}

// ── Step 2: Schema transforms ─────────────────────────────────────────────────

/**
 * OLD:  id, name, category, rating, price_range, latitude, longitude,
 *       created_by, created_at, description, phone, hours, website, image,
 *       owner_id, editorial_rating
 *
 * NEW:  id, name, latitude, longitude, location, image, category, rating,
 *       editorial_rating, price_range, description, phone, hours, website,
 *       owner_id, created_at, updated_at
 */
function transformRestaurant(row) {
  return {
    id:               row.id,
    name:             row.name             ?? '',
    category:         row.category         ?? '',
    rating:           row.rating           ?? 0,
    editorial_rating: row.editorial_rating ?? null,
    price_range:      row.price_range      ?? '',
    latitude:         row.latitude         ?? null,
    longitude:        row.longitude        ?? null,
    location:         (row.latitude != null && row.longitude != null)
                        ? { latitude: row.latitude, longitude: row.longitude }
                        : null,
    description:      row.description      ?? '',
    phone:            row.phone            ?? '',
    hours:            row.hours            ?? '',
    website:          row.website          ?? '',
    image:            row.image            ?? '',
    owner_id:         row.owner_id         ?? null,
    created_at:       row.created_at       ?? new Date().toISOString(),
    updated_at:       row.created_at       ?? new Date().toISOString(),
  };
}

/**
 * OLD:  id, uid, email, first_name, last_name, phone_number, business_name,
 *       role, created_at, is_verified
 *
 * NEW:  uid, email, first_name, last_name, role, is_verified,
 *       created_at, updated_at
 */
function transformBusinessOwner(row) {
  return {
    uid:         row.uid,
    email:       row.email       ?? '',
    first_name:  row.first_name  ?? '',
    last_name:   row.last_name   ?? '',
    role:        row.role        ?? 'business_owner',
    is_verified: row.is_verified ?? false,
    created_at:  row.created_at  ?? new Date().toISOString(),
    updated_at:  row.created_at  ?? new Date().toISOString(),
  };
}

/**
 * OLD:  uid, email, first_name, last_name, admin_level, is_active,
 *       created_at, last_login
 *
 * NEW:  uid, email, first_name, last_name, admin_level, is_active, created_at
 */
function transformAdmin(row) {
  return {
    uid:         row.uid,
    email:       row.email       ?? '',
    first_name:  row.first_name  ?? '',
    last_name:   row.last_name   ?? '',
    admin_level: row.admin_level ?? 'support',
    is_active:   row.is_active   ?? true,
    created_at:  row.created_at  ?? new Date().toISOString(),
  };
}

/**
 * OLD/NEW: id, restaurant_id, name, description, price, category, image,
 *          is_available, created_at, updated_at  (schemas match)
 */
function transformMenuItem(row) {
  return {
    id:            row.id,
    restaurant_id: row.restaurant_id,
    name:          row.name         ?? '',
    description:   row.description  ?? '',
    price:         row.price        ?? 0,
    category:      row.category     ?? '',
    image:         row.image        ?? '',
    is_available:  row.is_available ?? true,
    created_at:    row.created_at   ?? new Date().toISOString(),
    updated_at:    row.updated_at   ?? new Date().toISOString(),
  };
}

/**
 * OLD:  id, restaurant_id, device_id, stars, comment, created_at, updated_at
 * NEW:  id, restaurant_id, device_id, rating, comment, created_at
 */
function transformDeviceRating(row) {
  return {
    id:            row.id,
    restaurant_id: row.restaurant_id,
    device_id:     row.device_id ?? '',
    rating:        row.stars     ?? row.rating ?? 0,
    comment:       row.comment   ?? null,
    created_at:    row.created_at ?? new Date().toISOString(),
  };
}

// ── Step 3: Table migrations ──────────────────────────────────────────────────

const TABLE_MIGRATIONS = [
  { table: 'business_owners',            transform: transformBusinessOwner, conflictCol: 'uid' },
  { table: 'admins',                     transform: transformAdmin,         conflictCol: 'uid' },
  { table: 'restaurants',                transform: transformRestaurant,    conflictCol: 'id'  },
  { table: 'menu_items',                 transform: transformMenuItem,      conflictCol: 'id'  },
  { table: 'restaurant_device_ratings',  transform: transformDeviceRating,  conflictCol: 'id'  },
  { table: 'restaurant_ratings',         transform: r => r,                 conflictCol: 'id', optional: true },
  { table: 'restaurant_submissions',     transform: r => r,                 conflictCol: 'id', optional: true },
  { table: 'restaurant_device_favorites',transform: r => r,                 conflictCol: 'id', optional: true },
  { table: 'promos',                     transform: r => r,                 conflictCol: 'id', optional: true },
];

async function fetchAll(table) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await oldDb
      .from(table)
      .select('*')
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      const msg = error.message ?? '';
      if (error.code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache')) {
        return { rows: [], missing: true };
      }
      throw new Error(`Read error on "${table}": ${msg}`);
    }

    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }
  return { rows, missing: false };
}

async function upsertAll(table, rows, conflictCol, optional) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { error } = await newDb
      .from(table)
      .upsert(batch, { onConflict: conflictCol, ignoreDuplicates: false });

    if (error) {
      const msg = error.message ?? '';
      if (optional && (error.code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache'))) {
        console.log(`  ⚠️  Table "${table}" not in new project — skipping (optional)`);
        return;
      }
      throw new Error(`Write error on "${table}" (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${msg}`);
    }

    const end = Math.min(i + BATCH_SIZE, rows.length);
    console.log(`    ✓ Wrote rows ${i + 1}–${end}`);
  }
}

async function migrateTables() {
  const summary = [];

  for (const { table, transform, conflictCol, optional } of TABLE_MIGRATIONS) {
    console.log(`📦 ${table}${optional ? ' (optional)' : ''}`);

    let rows, missing;
    try {
      ({ rows, missing } = await fetchAll(table));
    } catch (err) {
      console.error(`  ❌ Read failed: ${err.message}`);
      summary.push({ table, status: 'ERROR (read)', count: 0 });
      continue;
    }

    if (missing) {
      console.log(`  ⚠️  Not in old project — skipped`);
      summary.push({ table, status: 'skipped (not in old)', count: 0 });
      continue;
    }

    if (rows.length === 0) {
      console.log(`  ℹ️  Empty — skipped`);
      summary.push({ table, status: 'skipped (empty)', count: 0 });
      continue;
    }

    console.log(`  📥 ${rows.length} rows read`);

    let transformed;
    try {
      transformed = rows.map(transform);
    } catch (err) {
      console.error(`  ❌ Transform failed: ${err.message}`);
      summary.push({ table, status: 'ERROR (transform)', count: rows.length });
      continue;
    }

    try {
      await upsertAll(table, transformed, conflictCol, optional);
      console.log(`  ✅ ${transformed.length} rows written`);
      summary.push({ table, status: 'OK', count: transformed.length });
    } catch (err) {
      console.error(`  ❌ Write failed: ${err.message}`);
      summary.push({ table, status: 'ERROR (write)', count: transformed.length });
    }

    console.log('');
  }

  return summary;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     Supabase Migration Script (with auth)        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Source : ${OLD_URL}`);
  console.log(`  Target : ${NEW_URL}`);
  console.log('');

  // Phase 1: migrate auth users (required before any FK-constrained tables)
  await migrateAuthUsers();

  // Phase 2: migrate data tables
  console.log('📋 Migrating data tables...');
  console.log('');
  const summary = await migrateTables();

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                 Migration Summary                ║');
  console.log('╚══════════════════════════════════════════════════╝');

  let totalRows = 0;
  let errors = 0;

  for (const { table, status, count } of summary) {
    const icon = status === 'OK' ? '✅' : status.startsWith('skipped') ? '⏭️ ' : '❌';
    console.log(`  ${icon}  ${table.padEnd(35)} ${String(count).padStart(5)} rows  [${status}]`);
    if (status === 'OK') totalRows += count;
    if (status.startsWith('ERROR')) errors++;
  }

  console.log('');
  console.log(`  Total rows migrated : ${totalRows}`);
  console.log(`  Tables with errors  : ${errors}`);
  console.log('');

  if (errors > 0) {
    console.log('⚠️  Some tables had errors. See output above.');
    console.log('');
    console.log('NOTE: Auth users were migrated with random passwords.');
    console.log('      Existing users must use "Forgot Password" to regain access.');
    process.exit(1);
  } else {
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('⚠️  IMPORTANT: Auth users were migrated with random passwords.');
    console.log('   All existing users must use "Forgot Password" to set a new password');
    console.log('   before they can log in to the new app.');
    process.exit(0);
  }
}

migrate().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
