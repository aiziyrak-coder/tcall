/**
 * Upload a local file to the remote server via SFTP (password auth).
 * Usage: DEPLOY_SSH_PASS=... node deploy/remote-put.mjs <localPath> <remotePath>
 */
import { Client } from "ssh2";
import { readFileSync } from "fs";

const HOST = process.env.DEPLOY_HOST || "164.90.186.193";
const USER = process.env.DEPLOY_USER || "root";
const PASS = process.env.DEPLOY_SSH_PASS || "";
const [localPath, remotePath] = process.argv.slice(2);

if (!PASS || !localPath || !remotePath) {
  console.error("usage: DEPLOY_SSH_PASS=.. node deploy/remote-put.mjs <local> <remote>");
  process.exit(2);
}

const conn = new Client();
conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) {
        console.error("SFTP:", err.message);
        conn.end();
        process.exit(1);
      }
      const data = readFileSync(localPath);
      sftp.writeFile(remotePath, data, (e) => {
        if (e) {
          console.error("WRITE:", e.message);
          conn.end();
          process.exit(1);
        }
        console.log("uploaded ->", remotePath);
        conn.end();
      });
    });
  })
  .on("error", (e) => {
    console.error("SSH:", e.message);
    process.exit(1);
  })
  .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
