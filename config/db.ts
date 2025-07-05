import { Sequelize } from 'sequelize-typescript'
import * as dotenv from 'dotenv'
dotenv.config()

const db = new Sequelize({
  database: process.env.DB_NAME,
  dialect: 'mysql',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  storage: ':memory:',
  logging: false,

})

export default db;