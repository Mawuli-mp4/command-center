import { neon } from '@neondatabase/serverless';
let _sql;
export function sql(strings, ...values) {
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql(strings, ...values);
}
