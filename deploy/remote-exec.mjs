/**
 * Generic remote command runner over SSH (password auth via ssh2).
 * Usage: DEPLOY_SSH_PASS=... node deploy/remote-exec.mjs "<command>"
 * No secrets are stored in this file; password comes from env.
 */
import { Client } from "ssh2";

const HOST = process.env.DEPLOY_HOST || "164.90.186.193";
const USER = process.env.DEPLOY_USER || "root";
const PASS = process.env.DEPLOY_SSH_PASS || "";
const cmd = process.argv.slice(2).join(" ");

if (!PASS) {
  console.error("DEPLOY_SSH_PASS environment variable kerak");
  process.exit(2);
}
if (!cmd) {
  console.error("Buyruq kerak: node deploy/remote-exec.mjs \"<command>\"");
  process.exit(2);
}

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) {
        console.error("EXEC xato:", err.message);
        conn.end();
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        conn.end();
        process.exit(typeof code === "number" ? code : 0);
      });
    });
  })
  .on("error", (e) => {
    console.error("SSH xato:", e.message);
    process.exit(1);
  })
  .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
