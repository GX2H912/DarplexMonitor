module.exports = {
    HOST: process.env.DB_HOST || '0.0.0.0', // or change this to just 127.0.0.1
    PORT: 3306,
    USER: 'root',
    PASSWORD: 'password',
    DB: 'account',
    dialect: 'mariadb', // change dialect to mysql if you're not using mariadb
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    WEBSERVER_PORT: 1000 // change this to your desired port
};
