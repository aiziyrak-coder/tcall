/**
 * Remote server deploy script — password auth via ssh2
 * Usage: node deploy/remote-deploy.mjs
 */
import { Client } from "ssh2";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOST = process.env.DEPLOY_HOST || "164.90.186.193";
const USER = process.env.DEPLOY_USER || "root";
const PASS = process.env.DEPLOY_SSH_PASS || "";
const APP_DIR = "/var/www/tcall";

if (!PASS) {
  console.error("DEPLOY_SSH_PASS environment variable kerak");
  process.exit(1);
}

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream.on("data", (d) => { out += d; process.stdout.write(d); });
      stream.stderr.on("data", (d) => { errOut += d; process.stderr.write(d); });
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`Exit ${code}: ${errOut || out}`));
        else resolve(out);
      });
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const content = readFileSync(localPath);
      sftp.writeFile(remotePath, content, (e) => (e ? reject(e) : resolve()));
    });
  });
}

const conn = new Client();

conn
  .on("ready", async () => {
    try {
      console.log("SSH ulandi\n");

      // Server .env yaratish
      const prodEnv = readFileSync(join(__dirname, ".env.production.server"), "utf8");

      await exec(conn, `mkdir -p ${APP_DIR} /var/log/tcall`);

      // .env yuklash
      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          sftp.writeFile(`${APP_DIR}/.env`, prodEnv, (e) => (e ? reject(e) : resolve()));
        });
      });
      console.log(".env yuklandi\n");

      // Git clone yoki pull
      const repoCheck = await exec(
        conn,
        `[ -d ${APP_DIR}/.git ] && echo EXISTS || echo NEW`
      ).catch(() => "NEW");

      if (repoCheck.trim().includes("NEW")) {
        await exec(conn, `git clone https://github.com/aiziyrak-coder/tcall.git ${APP_DIR}`);
      } else {
        await exec(conn, `cd ${APP_DIR} && git fetch origin && git reset --hard origin/main`);
      }

      // .env qayta yozish (git reset ustidan)
      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          sftp.writeFile(`${APP_DIR}/.env`, prodEnv, (e) => (e ? reject(e) : resolve()));
        });
      });

      // Node check / install
      await exec(conn, `command -v node >/dev/null || curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs`).catch(() => {});

      // Deploy
      await exec(conn, `cd ${APP_DIR} && chmod +x deploy/install.sh && bash deploy/install.sh`);

      console.log("\n=== DEPLOY MUVAFFAQIYATLI ===");
      conn.end();
    } catch (e) {
      console.error("Deploy xato:", e.message);
      conn.end();
      process.exit(1);
    }
  })
  .on("error", (e) => {
    console.error("SSH xato:", e.message);
    process.exit(1);
  })
  .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
