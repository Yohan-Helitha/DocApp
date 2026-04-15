import { Sequelize } from 'sequelize';
import 'dotenv/config';

const sequelize = new Sequelize(
  process.env.DB_NAME || process.env.PGDATABASE || 'patientdb',
  process.env.DB_USER || process.env.PGUSER || 'postgres',
  process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: process.env.DB_PORT || process.env.PGPORT || 5432,
    dialect: 'postgres',
    timezone: '+05:30', // Sri Lankan Timezone
    logging: false, // Set to console.log if you want to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export default sequelize;