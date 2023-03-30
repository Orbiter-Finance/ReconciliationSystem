const { NODE_ENV } = require("./env");

module.exports = {
    env: {
        isLocal: NODE_ENV === "local",
        isDev: NODE_ENV === "development",
        isProd: NODE_ENV === "production"
    }
};
console.log("NODE_ENV", NODE_ENV);