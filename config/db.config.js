const mysql = require('mysql2');
const bluebird = require('bluebird');
require('dotenv').config()
var {db_host, db_user , db_password,  port, default_database, replicaDb} = require('../config.json')

//const [host, port1] = db_host.split(':');

const dbConf = {
    host     : db_host.split(":")[0],
    user     : db_user,
    password : db_password,
    database : default_database,
    port : port,
    ssl: 'Amazon RDS',
                

    Promise: bluebird
};


const dbConf1 = {
    host     : replicaDb,
    user     : db_user,
    password : db_password,
    database : default_database,
    port : port,
    ssl: 'Amazon RDS',
    Promise: bluebird
};
class Database {

    static async getDBConnection() {
        try {
            if (!this.db) {
                // to test if credentials are correct
                await mysql.createConnection(dbConf);
                const pool = mysql.createPool(dbConf);
                
                var user_creation = "create TABLE IF NOT EXISTS users (first_name varchar(255), last_name varchar(255), id varchar(255),"
                +"username varchar(255) primary key , password varchar(255), account_created date, account_updated date, isVerified BOOL, verifiedDate date);";
                var image_creation = "create table if not exists image (filename varchar(200), url varchar(250), bucketName varchar(255), "
                +"username varchar(255),foreign key(username) references users(username), uploaded_date date, img_key varchar(250));";

                pool.query("show tables", function (err, result) {
                if (err) {
                    console.log("error in showing tables");
                    throw err;
                } else {
                    console.log("tables :", result);
                    pool.query(user_creation, function (err, result) {
                    if (err) {
                        console.log("error in creating user table");
                        throw err;
                    } else {
                        console.log("User Table created");
                        pool.query(image_creation, function (err, result) {
                        if (err) {
                            console.log("error in creating user table");
                            throw err;
                        }
                        console.log("Image Table created");
                        });
                    }
                    });
                }
                });
                const promisePool = pool.promise();
                promisePool.query
                this.db = promisePool;
            }
            return this.db;
        } catch (err) {
            console.log('Error in database connection');
            console.log(err.errro || err);
        }

    }
    static async getDBConnection1() {
        try {
            if (!this.db1) {
                // to test if credentials are correct
                await mysql.createConnection(dbConf1);
                const pool1 = mysql.createPool(dbConf1);
                
               
                pool1.query("show tables", function (err, result) {
                if (err) {
                    console.log("error in showing tables");
                    throw err;
                } else {
                    console.log("tables :", result);
                    
                }
                });
                const promisePool1 = pool1.promise();
                promisePool1.query
                this.db1 = promisePool1;
            }
            return this.db1;
        } catch (err) {
            console.log('Error in database connection');
            console.log(err.errro || err);
        }

    }
}


module.exports = Database;
