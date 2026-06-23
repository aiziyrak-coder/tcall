import { Client } from "ssh2";

const PASS = process.env.DEPLOY_SSH_PASS || "";
if (!PASS) { console.error("DEPLOY_SSH_PASS kerak"); process.exit(1); }

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => code !== 0 ? reject(new Error(`exit ${code}`)) : resolve());
    });
  });
}

const conn = new Client();
conn.on("ready", async () => {
  try {
    await exec(conn, `cd /var/www/tcall && git pull origin main && chmod +x deploy/restart.sh && bash deploy/restart.sh`);
    console.log("\nDone");
    conn.end();
  } catch (e) {
    console.error(e.message);
    conn.end();
    process.exit(1);
  }
}).connect({ host: "164.90.186.193", username: "root", password: PASS, readyTimeout: 30000 });
