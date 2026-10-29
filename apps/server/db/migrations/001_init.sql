-- Darby schema v1. All access goes through apps/server/src/db/repo.ts.

CREATE TABLE runs (
  id           TEXT PRIMARY KEY,
  goal         TEXT NOT NULL,
  mode         TEXT NOT NULL DEFAULT 'fixture',
  status       TEXT NOT NULL,                 -- planning | running | awaiting_approval | paused | finished | cancelled
  verdict      TEXT,                          -- VERIFIED | VERIFIED_WITH_GAPS | FAILED | NEEDS_YOU
  repair_of    TEXT REFERENCES runs(id),
  labels_json  TEXT NOT NULL DEFAULT '[]',    -- REPLAY / SIMULATED labels shown in UI and receipt
  plan_json    TEXT,
  receipt_json TEXT,
  created_at   TEXT NOT NULL,
  finished_at  TEXT
);

CREATE TABLE steps (
  run_id        TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_id       TEXT NOT NULL,
  position      INTEGER NOT NULL,
  title         TEXT NOT NULL,
  tool          TEXT NOT NULL,
  status        TEXT NOT NULL,
  args_json     TEXT NOT NULL,
  contract_json TEXT,
  result_json   TEXT,
  started_at    TEXT,
  finished_at   TEXT,
  PRIMARY KEY (run_id, step_id)
);
CREATE INDEX idx_steps_run ON steps(run_id, position);

CREATE TABLE events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id       TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  ts           TEXT NOT NULL,
  type         TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE INDEX idx_events_run ON events(run_id, id);

-- Append-only hash chain, one chain per run. hash = sha256(prev_hash || canonicalJson({index,ts,runId,stepId,type,payload})).
CREATE TABLE ledger (
  run_id       TEXT NOT NULL REFERENCES runs(id),
  idx          INTEGER NOT NULL,
  ts           TEXT NOT NULL,
  step_id      TEXT,
  type         TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  prev_hash    TEXT NOT NULL,
  hash         TEXT NOT NULL,
  PRIMARY KEY (run_id, idx)
);
CREATE INDEX idx_ledger_run ON ledger(run_id, idx);
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger
BEGIN SELECT RAISE(ABORT, 'ledger is append-only: UPDATE blocked'); END;
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger
BEGIN SELECT RAISE(ABORT, 'ledger is append-only: DELETE blocked'); END;

CREATE TABLE approvals (
  id            TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_id       TEXT NOT NULL,
  summary       TEXT NOT NULL,
  details_json  TEXT NOT NULL,
  content_hash  TEXT NOT NULL,
  status        TEXT NOT NULL,                -- pending | approved | denied | cancelled
  requested_at  TEXT NOT NULL,
  resolved_at   TEXT
);
CREATE INDEX idx_approvals_run ON approvals(run_id);

CREATE TABLE evidence (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_id    TEXT,
  kind       TEXT NOT NULL,                   -- screenshot | file | api
  path       TEXT NOT NULL,
  sha256     TEXT NOT NULL,
  bytes      INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_evidence_run ON evidence(run_id);

CREATE TABLE memory (
  id            TEXT PRIMARY KEY,
  key           TEXT NOT NULL,
  value         TEXT NOT NULL,
  source_run_id TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE playbooks (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  json       TEXT NOT NULL,
  ci_passed  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
