const oracledb = require('oracledb');
const dotenv = require('dotenv');

dotenv.config();

// Default output format to JavaScript Object instead of Array and enable autoCommit
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

let poolInitialized = false;

/**
 * Initialize Oracle connection pool
 */
async function initializeDatabase() {
  if (poolInitialized) {
    return;
  }

  const dbUser = process.env.DB_USER || 'RAILSAFARI';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbConnectString = process.env.DB_CONNECT_STRING || 'localhost:1521/FREEPDB1';

  if (!dbPassword) {
    console.warn('⚠️  [Database Warning]: DB_PASSWORD is empty in backend/.env. Connection pool initialization will fail until password is set.');
  }

  try {
    await oracledb.createPool({
      user: dbUser,
      password: dbPassword,
      connectString: dbConnectString,
      poolMin: 0,
      poolMax: 4,
      poolIncrement: 1,
      poolTimeout: 60
    });
    poolInitialized = true;
    console.log(`✅ [Oracle Database]: Connection pool initialized successfully for ${dbUser}@${dbConnectString}`);
  } catch (error) {
    console.error('❌ [Oracle Database Error]: Failed to initialize database connection pool.');
    console.error(`   Details: ${error.message}`);
    throw error;
  }
}

/**
 * Acquire a connection from the pool
 */
async function getConnection() {
  if (!poolInitialized) {
    await initializeDatabase();
  }
  return await oracledb.getConnection();
}

/**
 * Helper to execute a query using a connection from the pool with automatic connection release
 */
async function execute(sql, binds = [], options = {}) {
  let connection;
  try {
    connection = await getConnection();
    const execOptions = { autoCommit: true, ...options };
    const result = await connection.execute(sql, binds, execOptions);
    return result;
  } catch (error) {
    console.error('❌ [Database Execution Error]:', error.message);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err.message);
      }
    }
  }
}

/**
 * Check connectivity by executing a simple query against DUAL
 */
async function checkConnection() {
  try {
    const result = await execute("SELECT USER AS DB_USER, TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS DB_TIME FROM DUAL");
    return {
      connected: true,
      user: result.rows[0].DB_USER,
      serverTime: result.rows[0].DB_TIME
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Close pool during graceful shutdown
 */
async function closePool() {
  try {
    const defaultPool = oracledb.getPool();
    if (defaultPool) {
      await defaultPool.close(10);
      poolInitialized = false;
      console.log('✅ [Oracle Database]: Connection pool closed gracefully.');
    }
  } catch (error) {
    console.error('❌ [Oracle Database Error]: Error closing connection pool:', error.message);
  }
}

module.exports = {
  initializeDatabase,
  getConnection,
  execute,
  checkConnection,
  closePool
};
