const { isMaster, worker } = require("cluster");

// in-memory database (only used in the master process)
const db = {
    users: [],
    rides: []
};

// message ID counter for tracking responses
let messageId = 0;
const pendingMessages = new Map();

// Master process: Handle database operations
if (isMaster) {
    // listen for messages from workers
    process.on("message", (msg) => {
        if (msg.type === "db_operation") {
            const { id, operation, data } = msg;
            let result;

            try {
                switch (operation) {
                    case "get_users":
                        result = db.users;
                        break;
                    case "add_user":
                        db.users.push(data);
                        result = data;
                        break;
                    case "get_rides":
                        result = db.rides;
                        break;
                    case "add_ride":
                        db.rides.push(data);
                        result = data;
                        break;
                    case "update_ride":
                        const rideIndex = db.rides.findIndex((r) => r.id === data.id);
                        if (rideIndex !== -1) {
                            db.rides[rideIndex] = {
                                ...db.rides[rideIndex],
                                ...data
                            };
                            result = db.rides[rideIndex];
                        } else {
                            throw new Error("ride not found");
                        }
                        break;
                    default:
                        throw new Error("unknown operation");
                }
                // send a response back to worker
                process.send({
                    id, 
                    result
                });
            } catch (error) {
                process.send({
                    id,
                    error: error.message
                });
            }
        }
    });

    module.exports = db;
} else {
    // Worker process: communicate with the master for database operations
    const dbClient = {
        get users() {
            return new Promise((resolve, reject) => {
                const id = messageId++;
                pendingMessages.set(id, { resolve, reject });
                process.send({
                    type: "db_operation",
                    id, 
                    operation: "get_users",
                });
            });
        },
        addUser(user) {
            return new Promise((resolve, reject) => {
                const id = messageId++;
                pendingMessages.set(id, { resolve, reject });
                process.send({
                    type: "db_operation",
                    id,
                    operation: "add_user",
                    data: user,
                });
            });
        },
        addRide(ride) {
            return new Promise((resolve, reject) => {
                const id = messageId++;
                pendingMessages.set(id, { resolve, reject });
                process.send({
                    type: "db_operation",
                    id,
                    operation: "add_ride",
                    data: ride,
                });
            });
        },
        get rides() {
            return new Promise((resolve, reject) => {
                const id = messageId++;
                pendingMessages.set(id, { resolve, reject });
                process.send({
                    type: "db_operation",
                    id,
                    operation: "get_rides",
                });
            });
        },
        updateRide(ride) {
            return new Promise((resolve, reject) => {
                const id = messageId++;
                pendingMessages.set(id, { resolve, reject });
                process.send({
                    type: "db_operation",
                    id,
                    operation: "update_ride",
                    data: ride,
                });
            });
        },
    };

    // listen for responses from the master
    process.on("message", (msg) => {
        const { id, result, error } = msg;
        const { resolve, reject } = pendingMessages.get(id) || {};
        if (!resolve || !reject) return;
        pendingMessages.delete(id);
        if (error) {
            reject(new Error(error));
        } else {
            resolve(result);
        }
    });

    module.exports = dbClient;
}


// This code defines a simple in-memory database object with two properties: users and rides.
// The users property is an array that will hold user objects, while the rides property is an object that will hold ride objects indexed by their IDs.
// This structure allows for easy storage and retrieval of user and ride data during the development phase.
// In a real-world application, you would typically use a database management system (DBMS) like MongoDB, PostgreSQL, or MySQL to handle data persistence.
// The in-memory database is useful for testing and development purposes, but it will not persist data across server restarts.
// In a production environment, you would replace this in-memory database with a proper database connection and queries to store and retrieve data.
// The db object is exported for use in other parts of the application, such as routes or controllers.
// This allows you to access and manipulate the users and rides data from different parts of your application.
