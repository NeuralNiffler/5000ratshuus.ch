import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { getAllAusgaben, getAllGeschaefte } from "./content";
import { GESCHAEFT_ARTEN, GESCHAEFT_ART_LABEL, type GeschaeftArt } from "./schema";

/**
 * SQLite-Index gemäss Entwicklungsdokument Abschnitt 12: "Beim Build werden
 * die JSON-Dateien zusätzlich in eine SQLite-Datei geladen. Aus ihr
 * entstehen die Archivseiten nach Thema und Art des Geschäfts [...], und sie
 * ist die spätere Datenbasis für Phase 3."
 *
 * Die Dateien im Repository (artikel.md, geschaefte.json) bleiben die
 * Quelle der Wahrheit. Diese Datei wird bei jedem Build neu erzeugt und
 * nicht versioniert (siehe .gitignore).
 */

/** Relativ zu process.cwd(), aus demselben Grund wie CONTENT_DIR in content.ts. */
const DB_PATH = join(process.cwd(), ".build/index.sqlite");

/** Baut den Index komplett neu aus den aktuellen Inhalten in src/content/ausgaben. */
export function buildIndex(): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  try {
    db.exec(`
      DROP TABLE IF EXISTS geschaeft_quellen;
      DROP TABLE IF EXISTS geschaeft_tags;
      DROP TABLE IF EXISTS geschaefte;
      DROP TABLE IF EXISTS ausgaben;

      CREATE TABLE ausgaben (
        slug TEXT PRIMARY KEY,
        ordner TEXT NOT NULL,
        headline TEXT NOT NULL,
        template TEXT NOT NULL,
        date_published TEXT NOT NULL
      );

      CREATE TABLE geschaefte (
        row_id TEXT PRIMARY KEY,
        ausgabe_ordner TEXT NOT NULL,
        geschaeft_id TEXT NOT NULL,
        titel TEXT NOT NULL,
        art TEXT NOT NULL,
        urheber_name TEXT,
        urheber_partei TEXT,
        ereignis TEXT,
        referendumspflichtig INTEGER NOT NULL,
        budgetiert INTEGER NOT NULL,
        sitzungsdatum TEXT,
        publikationsdatum TEXT NOT NULL,
        gruppe TEXT
      );

      CREATE TABLE geschaeft_tags (
        row_id TEXT NOT NULL,
        tag TEXT NOT NULL
      );

      CREATE TABLE geschaeft_quellen (
        row_id TEXT NOT NULL,
        url TEXT NOT NULL,
        label TEXT NOT NULL,
        typ TEXT NOT NULL
      );

      CREATE INDEX idx_tags_tag ON geschaeft_tags(tag);
      CREATE INDEX idx_geschaefte_art ON geschaefte(art);
    `);

    // "Budgetiert, nicht effektiv" ist im Frontmatter pro Ausgabe gesetzt
    // (forecast) und gilt damit für ihre Geschäfte.
    const budgetiert = new Map(getAllAusgaben().map((a) => [a.ordner, a.frontmatter.forecast]));

    const insertAusgabe = db.prepare(
      `INSERT INTO ausgaben (slug, ordner, headline, template, date_published) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const a of getAllAusgaben()) {
      insertAusgabe.run(
        a.frontmatter.slug,
        a.ordner,
        a.frontmatter.headline,
        a.frontmatter.template,
        a.frontmatter.datePublished,
      );
    }

    const insertGeschaeft = db.prepare(`
      INSERT INTO geschaefte
        (row_id, ausgabe_ordner, geschaeft_id, titel, art, urheber_name, urheber_partei, ereignis, referendumspflichtig, budgetiert, sitzungsdatum, publikationsdatum, gruppe)
      VALUES (@rowId, @ausgabe, @id, @titel, @art, @urheberName, @urheberPartei, @ereignis, @referendumspflichtig, @budgetiert, @sitzungsdatum, @publikationsdatum, @gruppe)
    `);
    const insertTag = db.prepare(`INSERT INTO geschaeft_tags (row_id, tag) VALUES (?, ?)`);
    const insertQuelle = db.prepare(
      `INSERT INTO geschaeft_quellen (row_id, url, label, typ) VALUES (?, ?, ?, ?)`,
    );

    for (const g of getAllGeschaefte()) {
      const rowId = `${g.ausgabe}:${g.id}`;
      insertGeschaeft.run({
        rowId,
        ausgabe: g.ausgabe,
        id: g.id,
        titel: g.titel,
        art: g.art,
        urheberName: g.urheber?.name ?? null,
        urheberPartei: g.urheber?.partei ?? null,
        ereignis: g.ereignis,
        referendumspflichtig: g.referendumspflichtig ? 1 : 0,
        budgetiert: budgetiert.get(g.ausgabe) ? 1 : 0,
        sitzungsdatum: g.sitzungsdatum,
        publikationsdatum: g.publikationsdatum,
        gruppe: g.gruppe,
      });
      for (const tag of g.tags) insertTag.run(rowId, tag);
      for (const q of g.quellen) insertQuelle.run(rowId, q.url, q.label, q.typ);
    }
  } finally {
    db.close();
  }
}

function withDb<T>(fn: (db: Database.Database) => T): T {
  buildIndex();
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export interface ArchivEintrag {
  rowId: string;
  ausgabeOrdner: string;
  geschaeftId: string;
  titel: string;
  art: GeschaeftArt;
  urheberName: string | null;
  urheberPartei: string | null;
  ereignis: string | null;
  referendumspflichtig: boolean;
  /** Zahlen aus Budget oder Politikplan: Prognosen, keine Ist-Werte. */
  budgetiert: boolean;
  publikationsdatum: string;
  tags: string[];
  quellen: { url: string; label: string; typ: string }[];
}

function ladeZusatzdaten(db: Database.Database, rowIds: string[]): {
  tags: Map<string, string[]>;
  quellen: Map<string, { url: string; label: string; typ: string }[]>;
} {
  const tags = new Map<string, string[]>();
  const quellen = new Map<string, { url: string; label: string; typ: string }[]>();
  if (rowIds.length === 0) return { tags, quellen };

  const placeholders = rowIds.map(() => "?").join(",");
  for (const row of db
    .prepare(`SELECT row_id, tag FROM geschaeft_tags WHERE row_id IN (${placeholders})`)
    .all(...rowIds) as { row_id: string; tag: string }[]) {
    const list = tags.get(row.row_id) ?? [];
    list.push(row.tag);
    tags.set(row.row_id, list);
  }
  for (const row of db
    .prepare(`SELECT row_id, url, label, typ FROM geschaeft_quellen WHERE row_id IN (${placeholders})`)
    .all(...rowIds) as { row_id: string; url: string; label: string; typ: string }[]) {
    const list = quellen.get(row.row_id) ?? [];
    list.push({ url: row.url, label: row.label, typ: row.typ });
    quellen.set(row.row_id, list);
  }
  return { tags, quellen };
}

function mapRow(
  row: any,
  tags: Map<string, string[]>,
  quellen: Map<string, { url: string; label: string; typ: string }[]>,
): ArchivEintrag {
  return {
    rowId: row.row_id,
    ausgabeOrdner: row.ausgabe_ordner,
    geschaeftId: row.geschaeft_id,
    titel: row.titel,
    art: row.art,
    urheberName: row.urheber_name,
    urheberPartei: row.urheber_partei,
    ereignis: row.ereignis,
    referendumspflichtig: !!row.referendumspflichtig,
    budgetiert: !!row.budgetiert,
    publikationsdatum: row.publikationsdatum,
    tags: tags.get(row.row_id) ?? [],
    quellen: quellen.get(row.row_id) ?? [],
  };
}

export function getDistinctTags(): string[] {
  return withDb((db) =>
    (db.prepare(`SELECT DISTINCT tag FROM geschaeft_tags ORDER BY tag`).all() as { tag: string }[]).map(
      (r) => r.tag,
    ),
  );
}

export function getDistinctArten(): GeschaeftArt[] {
  return withDb((db) =>
    (db.prepare(`SELECT DISTINCT art FROM geschaefte ORDER BY art`).all() as { art: GeschaeftArt }[]).map(
      (r) => r.art,
    ),
  ).filter((art) => GESCHAEFT_ARTEN.includes(art));
}

export function getGeschaefteByTag(tag: string): ArchivEintrag[] {
  return withDb((db) => {
    const rows = db
      .prepare(
        `SELECT g.* FROM geschaefte g JOIN geschaeft_tags t ON t.row_id = g.row_id WHERE t.tag = ? ORDER BY g.publikationsdatum DESC`,
      )
      .all(tag) as any[];
    const { tags, quellen } = ladeZusatzdaten(db, rows.map((r) => r.row_id));
    return rows.map((r) => mapRow(r, tags, quellen));
  });
}

export function getGeschaefteByArt(art: GeschaeftArt): ArchivEintrag[] {
  return withDb((db) => {
    const rows = db
      .prepare(`SELECT * FROM geschaefte WHERE art = ? ORDER BY publikationsdatum DESC`)
      .all(art) as any[];
    const { tags, quellen } = ladeZusatzdaten(db, rows.map((r) => r.row_id));
    return rows.map((r) => mapRow(r, tags, quellen));
  });
}

export function getAlleGeschaefte(): ArchivEintrag[] {
  return withDb((db) => {
    const rows = db.prepare(`SELECT * FROM geschaefte ORDER BY publikationsdatum DESC`).all() as any[];
    const { tags, quellen } = ladeZusatzdaten(db, rows.map((r) => r.row_id));
    return rows.map((r) => mapRow(r, tags, quellen));
  });
}

export function getDistinctJahre(): string[] {
  return withDb((db) =>
    (
      db
        .prepare(
          `SELECT DISTINCT substr(publikationsdatum, 1, 4) AS jahr FROM geschaefte ORDER BY jahr DESC`,
        )
        .all() as { jahr: string }[]
    ).map((r) => r.jahr),
  );
}

export function getDistinctMonateFuerJahr(jahr: string): string[] {
  return withDb((db) =>
    (
      db
        .prepare(
          `SELECT DISTINCT substr(publikationsdatum, 6, 2) AS monat FROM geschaefte WHERE substr(publikationsdatum, 1, 4) = ? ORDER BY monat DESC`,
        )
        .all(jahr) as { monat: string }[]
    ).map((r) => r.monat),
  );
}

export function getGeschaefteByJahr(jahr: string): ArchivEintrag[] {
  return withDb((db) => {
    const rows = db
      .prepare(
        `SELECT * FROM geschaefte WHERE substr(publikationsdatum, 1, 4) = ? ORDER BY publikationsdatum DESC`,
      )
      .all(jahr) as any[];
    const { tags, quellen } = ladeZusatzdaten(db, rows.map((r) => r.row_id));
    return rows.map((r) => mapRow(r, tags, quellen));
  });
}

export function getGeschaefteByJahrMonat(jahr: string, monat: string): ArchivEintrag[] {
  return withDb((db) => {
    const rows = db
      .prepare(
        `SELECT * FROM geschaefte WHERE substr(publikationsdatum, 1, 4) = ? AND substr(publikationsdatum, 6, 2) = ? ORDER BY publikationsdatum DESC`,
      )
      .all(jahr, monat) as any[];
    const { tags, quellen } = ladeZusatzdaten(db, rows.map((r) => r.row_id));
    return rows.map((r) => mapRow(r, tags, quellen));
  });
}

export { GESCHAEFT_ART_LABEL };
