export default {
    schema: './configs/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    },
  };