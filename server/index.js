const app = require("./app");
const config = require("./config");
const db = require("./db");
const { verifyEmailTransport } = require("./utils/email");

async function start() {
  try {
    await db.query("SELECT 1");
    try {
      await verifyEmailTransport();
      console.log("SMTP transport verified successfully.");
    } catch (error) {
      console.error("SMTP transport verification failed.");
      console.error(error);
    }
    app.listen(config.port, () => {
      console.log(`AR-FIT API listening on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start AR-FIT API.");
    console.error(error);
    process.exit(1);
  }
}

start();
