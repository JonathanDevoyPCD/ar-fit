const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
});

module.exports = {
  query(text, params) {
    return pool.query(text, params);
  },
  connect() {
    return pool.connect();
  },
  pool,
};
