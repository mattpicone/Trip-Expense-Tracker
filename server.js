const http = require("http");
const fs = require("fs");
const path = require("path");
const database = require("./database");

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
