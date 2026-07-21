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

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    trip_id INTEGER NOT NULL,
    paid_by INTEGER NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (paid_by) REFERENCES participants(id)
  );

  CREATE TABLE IF NOT EXISTS expense_participants (
    expense_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (participant_id) REFERENCES participants(id)
  );
`);

module.exports = database;
