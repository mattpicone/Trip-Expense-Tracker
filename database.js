const { DatabaseSync } = require("node:sqlite");

const database = new DatabaseSync("trip-expenses.db");

database.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

module.exports = database;
