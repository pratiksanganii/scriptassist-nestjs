import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { InitialSchema1615123456789 } from './migrations/initial-schema.migration';

// Load environment variables
dotenv.config();

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'taskflow',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [InitialSchema1615123456789],
  migrationsTableName: 'migrations',
  synchronize: false, // Important: Set to false for production
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
