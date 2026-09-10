const http = require("http");
const fs = require("fs");
const path = require("path");
const database = require("./database");

function calculateBalances(participants, expenses) {
  const balances = Object.fromEntries(participants.map((participant) => [participant, 0]));

  for (const expense of expenses) {
    const share = Math.floor(expense.amount / expense.shared_by.length);
    let leftover = expense.amount % expense.shared_by.length;

    balances[expense.paid_by] += expense.amount;

    for (const person of expense.shared_by) {
      balances[person] -= share + (leftover-- > 0 ? 1 : 0);
    }
  }

  return balances;
}

const server = http.createServer((request, response) => {
  if (request.url === "/api/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Backend is working!" }));
    return;
  }

  if (request.url === "/api/trips" && request.method === "GET") {
    const trips = database.prepare("SELECT * FROM trips").all();
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(trips));
    return;
  }

  if (request.url === "/api/trips" && request.method === "POST") {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      const trip = JSON.parse(body);
      const result = database
        .prepare("INSERT INTO trips (name) VALUES (?)")
        .run(trip.name);

      response.writeHead(201, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ id: result.lastInsertRowid, name: trip.name }));
    });

    return;
  }

  if (request.url === "/api/participants" && request.method === "POST") {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      const participant = JSON.parse(body);
      const result = database
        .prepare("INSERT INTO participants (name, trip_id) VALUES (?, ?)")
        .run(participant.name, participant.trip_id);

      response.writeHead(201, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          id: result.lastInsertRowid,
          name: participant.name,
          trip_id: participant.trip_id
        })
      );
    });

    return;
  }

  if (request.url.startsWith("/api/participants?") && request.method === "GET") {
    const url = new URL(request.url, "http://localhost");
    const tripId = url.searchParams.get("trip_id");
    const participants = database
      .prepare("SELECT * FROM participants WHERE trip_id = ?")
      .all(tripId);
    const expenses = database
      .prepare(`
        SELECT expenses.id, expenses.amount, expenses.paid_by,
               GROUP_CONCAT(expense_participants.participant_id) AS shared_by
        FROM expenses
        LEFT JOIN expense_participants
          ON expenses.id = expense_participants.expense_id
        WHERE expenses.trip_id = ?
        GROUP BY expenses.id
      `)
      .all(tripId)
      .map((expense) => ({
        ...expense,
        shared_by: expense.shared_by ? expense.shared_by.split(",").map(Number) : []
      }));
    const balances = calculateBalances(
      participants.map((participant) => participant.id),
      expenses
    );

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify(
        participants.map((participant) => ({
          ...participant,
          balance: balances[participant.id]
        }))
      )
    );
    return;
  }

  if (request.url === "/api/expenses" && request.method === "POST") {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      const expense = JSON.parse(body);
      const result = database
        .prepare(
          "INSERT INTO expenses (description, amount, trip_id, paid_by) VALUES (?, ?, ?, ?)"
        )
        .run(
          expense.description,
          expense.amount,
          expense.trip_id,
          expense.paid_by
        );

      const addParticipant = database.prepare(
        "INSERT INTO expense_participants (expense_id, participant_id) VALUES (?, ?)"
      );

      for (const participantId of expense.participant_ids || []) {
        addParticipant.run(result.lastInsertRowid, participantId);
      }

      response.writeHead(201, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          id: result.lastInsertRowid,
          description: expense.description,
          amount: expense.amount,
          trip_id: expense.trip_id,
          paid_by: expense.paid_by,
          participant_ids: expense.participant_ids || []
        })
      );
    });

    return;
  }

  if (request.url.startsWith("/api/expenses?") && request.method === "GET") {
    const url = new URL(request.url, "http://localhost");
    const tripId = url.searchParams.get("trip_id");
    const expenses = database
      .prepare(`
        SELECT expenses.id, expenses.description, expenses.amount,
               participants.name AS paid_by_name,
               GROUP_CONCAT(shared_people.name, ', ') AS shared_by_names
        FROM expenses
        JOIN participants ON expenses.paid_by = participants.id
        LEFT JOIN expense_participants
          ON expenses.id = expense_participants.expense_id
        LEFT JOIN participants AS shared_people
          ON expense_participants.participant_id = shared_people.id
        WHERE expenses.trip_id = ?
        GROUP BY expenses.id
      `)
      .all(tripId);

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(expenses));
    return;
  }

  fs.readFile(path.join(__dirname, "index.html"), (error, page) => {
    if (error) {
      response.writeHead(500);
      response.end("Could not load the page.");
      return;
    }

    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(page);
  });
});

server.listen(3000, () => {
  console.log("App running at http://localhost:3000");
});
