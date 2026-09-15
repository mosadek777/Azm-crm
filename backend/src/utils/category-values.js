// Lists the distinct ticket category values actually in use, with counts.
//
// spec 002 FR-004 — the first step of reversing decision 21 (flat category
// string) and restoring the category tree.
//
//   node src/utils/category-values.js            # table, for reading
//   node src/utils/category-values.js --markdown # a table to paste into a doc
//   node src/utils/category-values.js --json     # for a migration script
//
// ── WHY THIS IS A SCRIPT AND NOT A ONE-OFF QUERY ────────────────────────────
//
// It has to be run against the LIVE database, by somebody who has one, and its
// output is what goes to the client. A number typed out of a developer's demo
// seed is not evidence about anybody's real categories, and the analysis in
// docs/decisions-pending.md §27 turns entirely on what the real values are.
//
// ── WHAT IT REPORTS, AND WHY EACH COLUMN EARNS ITS PLACE ────────────────────
//
//   count            how much of the estate rides on this value. A category
//                    with 4,000 tickets and one with 2 are different problems.
//   first / last     a value that stopped being used two years ago is history,
//                    not taxonomy. One first used last week may be a typo that
//                    has not spread yet.
//   separator        a value containing / > | or a dash ALREADY carries an
//                    implied hierarchy. This is the finding that decided the
//                    approach: "Billing / Refund" means people needed a tree
//                    and made one out of punctuation. A migration that maps
//                    distinct strings to flat nodes would create a node called
//                    "Billing / Refund" sitting beside "Billing".
//   collisions       two values that differ only in case or whitespace are one
//                    category typed twice, and they must be merged BEFORE the
//                    tree is authored rather than becoming two leaves.
//
// It reads and writes nothing. No audit entry, because nothing is mutated.

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectMongoose } from '../DB/connection.db.js'
import { Ticket } from '../DB/models/ticket.model.js'

/** Case- and whitespace-insensitive, which is how two "same" values differ. */
const normalise = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Characters people reach for when they want a hierarchy and have none. */
const SEPARATORS = /[/>|»\\]|\s[-–—]\s/

export const collectCategoryValues = async () => {
  const rows = await Ticket.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        first: { $min: '$createdAt' },
        last: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1, _id: 1 } }
  ])

  const total = await Ticket.countDocuments({})

  const values = rows.map(r => ({
    value: r._id,
    count: r.count,
    first: r.first,
    last: r.last,
    hasSeparator: SEPARATORS.test(String(r._id ?? ''))
  }))

  // Two distinct stored values that normalise to the same thing.
  const byNormalised = new Map()
  for (const v of values) {
    const key = normalise(v.value)
    if (!byNormalised.has(key)) byNormalised.set(key, [])
    byNormalised.get(key).push(v.value)
  }
  const collisions = [...byNormalised.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([normalised, group]) => ({ normalised, values: group }))

  return { total, distinct: values.length, values, collisions }
}

const asMarkdown = (r) => {
  const lines = [
    `**${r.total} tickets, ${r.distinct} distinct category values.**`,
    '',
    '| Value | Tickets | First used | Last used | Looks hierarchical |',
    '|---|---|---|---|---|'
  ]
  for (const v of r.values) {
    lines.push(`| \`${v.value}\` | ${v.count} | ${new Date(v.first).toISOString().slice(0, 10)} | ${new Date(v.last).toISOString().slice(0, 10)} | ${v.hasSeparator ? '**yes**' : '—'} |`)
  }
  if (r.collisions.length) {
    lines.push('', '**Values differing only in case or spacing — one category typed twice:**', '')
    for (const c of r.collisions) lines.push(`- ${c.values.map(v => `\`${v}\``).join(' · ')}`)
  } else {
    lines.push('', '_No two values differ only in case or spacing._')
  }
  return lines.join('\n')
}

const asTable = (r) => {
  const width = Math.max(5, ...r.values.map(v => String(v.value).length))
  const lines = [
    `${r.total} tickets · ${r.distinct} distinct values`,
    '',
    `${'value'.padEnd(width)}  count  hierarchical`,
    `${'-'.repeat(width)}  -----  ------------`
  ]
  for (const v of r.values) {
    lines.push(`${String(v.value).padEnd(width)}  ${String(v.count).padStart(5)}  ${v.hasSeparator ? 'YES' : ''}`)
  }
  if (r.collisions.length) {
    lines.push('', 'COLLISIONS (differ only in case or spacing):')
    for (const c of r.collisions) lines.push(`  ${c.values.join('  |  ')}`)
  }
  return lines.join('\n')
}

// Run directly, not when imported by a migration that wants the same data.
if (process.argv[1] && process.argv[1].endsWith('category-values.js')) {
  await connectMongoose()
  const result = await collectCategoryValues()
  const mode = process.argv[2]
  console.log(mode === '--json' ? JSON.stringify(result, null, 2)
    : mode === '--markdown' ? asMarkdown(result)
      : asTable(result))
  await mongoose.disconnect()
}
