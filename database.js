const { DatabaseSync } = require("node:sqlite");

const database = new DatabaseSync("trip-expenses.db");

database.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    trip_id INTEGER NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id)
  );
`);

module.exports = database;
