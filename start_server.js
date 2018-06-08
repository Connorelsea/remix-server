import { Client } from "pg";
import { startApolloEngine, startExpressApp, startServer } from ".";

async function start() {
  console.log("[Server] Connecting to PostgreSQL");

  const client = new Client();
  await client.connect();

  console.log("[Server] Checking if remix database exists");

  const response = await client.query(`
    SELECT COUNT(*) = 1 as EXISTS FROM pg_catalog.pg_database WHERE datname = 'remix'
  `);
  const { rows } = response;

  if (response.rows.length < 1)
    console.error("[Server] Error, no rows, database not found");

  if (!rows[0].exists) {
    await client.query(`CREATE DATABASE remix`);
  } else {
    console.error("[Server] remix database exists, will attempt to connect");
  }

  await client.end();
}

start();

startServer();
