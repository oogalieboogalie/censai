import { createDbPool } from './db.js';

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb('Database Connection Test', () => {
  let pool;

  beforeEach(() => {
    pool = createDbPool(process.env.DATABASE_URL);
  });

  afterEach(async () => {
    await pool?.end();
  });

  test('should connect to the database and execute a simple query', async () => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as "result"');
      expect(result.rows[0].result).toBe(1);
    } finally {
      client.release();
    }
  });

  test('should keep the shared app pool out of test cleanup', () => {
    expect(pool.ended).toBe(false);
  });
});
