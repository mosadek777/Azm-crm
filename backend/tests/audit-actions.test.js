// Every audit action this backend can write has a bilingual label in the
// interface's dictionary.
//
// spec 010 FR-008 (every mutation is audited), 012 FR-001 / AS-03 (no language
// fallback, ever), constitution I.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//
// `ticket.mentioned` was added with the mention feature and nobody added its
// label. It reached the ticket history and rendered as
// `⟦missing key: action.ticket.mentioned⟧` IN FRONT OF A READER. It was caught
// by a browser check on an unrelated feature, days later, and only because that
// ticket happened to have a mention on it.
//
// Twelve more were missing at the same moment and had NOT surfaced, purely
// because no screen reads the whole audit log yet. `010 FR-009`'s audit viewer
// would have shown all thirteen at once, to an auditor, as the first thing they
// ever saw.
//
// The marker itself is correct — `AS-03` requires a missing translation to be
// VISIBLE rather than silently falling back to the other language. What was
// missing was anything that noticed before a person did.
//
// ── IT LIVES HERE, NOT IN THE FRONTEND SUITE ────────────────────────────────
//
// The natural home looks like `frontend/`, and that needs `@types/node` added
// to an application tsconfig so a test can read a file. Reading the dictionary
// as TEXT from this side needs nothing, and this is the suite that runs on
// every backend change — which is when a new action gets written.
//
// ── ITS ONE LIMITATION, STATED ──────────────────────────────────────────────
//
// It greps for `action:` literals. An action assembled at runtime from a
// variable would not be found. Every call site today passes a literal or a
// ternary of two literals, both of which this handles, and keeping it that way
// is worth more than the cleverness a dynamic action would buy.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createChecker } from './check.js'

const here = resolve(fileURLToPath(import.meta.url), '..')
const BACKEND_SRC = resolve(here, '../src')
const DICTIONARY = resolve(here, '../../frontend/src/app/core/i18n/dictionary.ts')

const checker = createChecker({ indent: '' })
const chk = checker.chk

const jsFilesUnder = (dir) => {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...jsFilesUnder(full))
    else if (entry.endsWith('.js')) out.push(full)
  }
  return out
}

// `action:` to the end of its line, then every quoted dotted identifier on it —
// which covers `action: cond ? 'a.b' : 'c.d'` as well as `action: 'a.b'`.
const actions = (() => {
  const found = new Set()
  for (const file of jsFilesUnder(BACKEND_SRC)) {
    for (const line of readFileSync(file, 'utf8').match(/action:[^\n]*/g) ?? []) {
      for (const m of line.matchAll(/'([a-z_]+\.[a-z_]+)'/g)) found.add(m[1])
    }
  }
  return [...found].sort()
})()

const dictionary = readFileSync(DICTIONARY, 'utf8')

/** The `{ ar, en }` pair for one key, or null. Read as text, not evaluated. */
const entryFor = (key) => {
  const i = dictionary.indexOf(`'${key}':`)
  if (i < 0) return null
  // Up to the closing brace of this entry — entries never nest.
  const chunk = dictionary.slice(i, dictionary.indexOf('}', i) + 1)
  const ar = chunk.match(/ar:\s*'((?:[^'\\]|\\.)*)'/)
  const en = chunk.match(/en:\s*'((?:[^'\\]|\\.)*)'/)
  return { ar: ar?.[1] ?? '', en: en?.[1] ?? '' }
}

console.log('\n--- the extraction found something, so nothing below is vacuous ---')
chk('more than twenty audit actions were found', actions.length > 20, true)
chk('  including one we know exists', actions.includes('ticket.created'), true)
chk('  and the one that caused this test', actions.includes('ticket.mentioned'), true)
chk('the dictionary was read', dictionary.length > 1000, true)

console.log('\n--- every action has a label ---')
const missing = actions.filter(a => !entryFor(`action.${a}`))
chk(`no action is unlabelled${missing.length ? ' — missing: ' + missing.join(', ') : ''}`,
  missing.length, 0)

console.log('\n--- constitution I: both languages, on every one of them ---')
const halfTranslated = actions
  .map(a => ({ key: `action.${a}`, entry: entryFor(`action.${a}`) }))
  .filter(x => x.entry && (!x.entry.ar.trim() || !x.entry.en.trim()))
  .map(x => x.key)
chk(`none is half-translated${halfTranslated.length ? ' — ' + halfTranslated.join(', ') : ''}`,
  halfTranslated.length, 0)

// Not a hard rule — an identifier could legitimately read the same in both —
// but for a human-readable ACTION label it has always meant one side was
// pasted and never translated.
const identical = actions
  .map(a => ({ key: `action.${a}`, entry: entryFor(`action.${a}`) }))
  .filter(x => x.entry && x.entry.ar === x.entry.en)
  .map(x => x.key)
chk(`none has the same text in both languages${identical.length ? ' — ' + identical.join(', ') : ''}`,
  identical.length, 0)

console.log(`\n(${actions.length} audit actions checked)`)

process.exit(checker.report())
