const crypto = require('crypto');
const db = require('../config/database');

/**
 * Hash password using SHA-256
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Register a new user in the USERS table
 */
async function registerUser({ fullName, phone, email, password, irctcNumber }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  const cleanName = fullName.trim();
  const irctc = irctcNumber ? irctcNumber.trim() : null;

  // Check if user with same email or phone exists
  const checkSql = `
    SELECT USER_ID, EMAIL, PHONE FROM USERS 
    WHERE UPPER(EMAIL) = UPPER(:email) OR PHONE = :phone
  `;
  const checkResult = await db.execute(checkSql, { email: cleanEmail, phone: cleanPhone });

  if (checkResult.rows && checkResult.rows.length > 0) {
    const existing = checkResult.rows[0];
    if (existing.EMAIL.toLowerCase() === cleanEmail) {
      throw { statusCode: 409, message: 'An account with this email already exists.' };
    }
    if (existing.PHONE === cleanPhone) {
      throw { statusCode: 409, message: 'An account with this phone number already exists.' };
    }
  }

  const hashedPassword = hashPassword(password);

  await db.execute(`
    INSERT INTO USERS (
      USER_ID,
      FULL_NAME,
      PHONE,
      IRCTC_NUMBER,
      EMAIL,
      PASSWORD_HASH,
      VERIFICATION_STATUS,
      CREATED_AT
    ) VALUES (
      USER_SEQ.NEXTVAL,
      :fullName,
      :phone,
      :irctcNumber,
      :email,
      :passwordHash,
      'VERIFIED',
      SYSDATE
    )
  `, {
    fullName: cleanName,
    phone: cleanPhone,
    irctcNumber: irctc,
    email: cleanEmail,
    passwordHash: hashedPassword
  });

  // Fetch newly created user by phone number
  const userResult = await db.execute(`
    SELECT 
      USER_ID,
      FULL_NAME,
      PHONE,
      IRCTC_NUMBER,
      EMAIL,
      VERIFICATION_STATUS,
      TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
    FROM USERS
    WHERE PHONE = :phone
  `, { phone: cleanPhone });

  const newUser = userResult.rows[0];

  return {
    userId: newUser.USER_ID,
    fullName: newUser.FULL_NAME,
    phone: newUser.PHONE,
    irctcNumber: newUser.IRCTC_NUMBER || null,
    email: newUser.EMAIL,
    verificationStatus: newUser.VERIFICATION_STATUS,
    createdAt: newUser.CREATED_AT
  };
}

/**
 * Authenticate user login
 */
async function loginUser({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();

  const sql = `
    SELECT 
      USER_ID,
      FULL_NAME,
      PHONE,
      IRCTC_NUMBER,
      EMAIL,
      PASSWORD_HASH,
      VERIFICATION_STATUS,
      TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT
    FROM USERS
    WHERE LOWER(EMAIL) = :email
  `;

  const result = await db.execute(sql, { email: cleanEmail });

  if (!result.rows || result.rows.length === 0) {
    throw { statusCode: 401, message: 'Invalid email or password.' };
  }

  const user = result.rows[0];
  const inputHash = hashPassword(password);

  if (user.PASSWORD_HASH !== inputHash) {
    throw { statusCode: 401, message: 'Invalid email or password.' };
  }

  return {
    userId: user.USER_ID,
    fullName: user.FULL_NAME,
    phone: user.PHONE,
    irctcNumber: user.IRCTC_NUMBER || null,
    email: user.EMAIL,
    verificationStatus: user.VERIFICATION_STATUS,
    createdAt: user.CREATED_AT
  };
}

module.exports = {
  registerUser,
  loginUser
};
