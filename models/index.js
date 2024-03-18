const dbConfig = require('../config/dbConfig.js');
const { Sequelize, DataTypes } = require('sequelize');
const mysql = require("mysql");

const run_pre_sequelize = async () => {
    const connection = await mysql.createConnection({
        host: dbConfig.HOST, 
        port: dbConfig.PORT, 
        user: dbConfig.USER, 
        password: dbConfig.PASSWORD
    })
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.DB}\`;`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`server_stats\`;`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`player_stats\`;`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`mineplex\`;`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`mineplex_stats\`;`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`mssql_mock\`;`);
    await connection.end();
}

run_pre_sequelize()

const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD,
    {
        host: dbConfig.HOST,
        port: dbConfig.PORT,
        dialect: dbConfig.dialect,
        dialectOptions: {
            multipleStatements: true
        },
        logging: false,
        pool: {
            max: dbConfig.pool.max,
            min: dbConfig.pool.min,
            acquire: dbConfig.pool.acquire,
            idle: dbConfig.pool.idle,
        }
    }
);



const initializeAccountTables = require('../misc_models/init-models.js');
const initializePlayerStatsTables = require('../player_stats/init-models.js');
const initializeServerStatsTables = require('../server_stats/init-models.js');
initializeAccountTables(sequelize);
initializePlayerStatsTables(sequelize);
initializeServerStatsTables(sequelize);


sequelize.authenticate()
.then(() => {
    console.log("Sequelize connected");
}).catch((err) => {
    console.log("Error: " + err);
});


const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.playerAccounts = require("./playerModel.js")(sequelize, DataTypes, Sequelize);
db.chat = require("./chatModel.js")(sequelize, DataTypes, db.playerAccounts);
db.accountPets = require("./petModel")(sequelize, DataTypes, db.playerAccounts);
db.boosters = require("./boosterModel")(sequelize, DataTypes, db.playerAccounts);
db.transactions = require("./transactionModel.js")(sequelize, DataTypes, db.playerAccounts);


db.sequelize.sync({ force: false })
.then(() => { 
    console.log("Resync completed."); 
    const DataManager = require('../DataManager.js');
    DataManager.dumpIfTablesEmpty(sequelize, DataTypes);
});

module.exports = db;
