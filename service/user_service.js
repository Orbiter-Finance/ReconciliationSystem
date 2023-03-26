const configEnv = require("../config/env");
const user = require('../model/user');
const { md5 } = require('../utils/encrypt');

async function initUser() {
    const accountList = configEnv?.account || [];
    for (const account of accountList) {
        const password = md5(account.password);
        const name = account.name;
        const role = +account.role || 2;
        const usr = await user.findOneAndUpdate({
            name,
        }, { name, password, role, status: 1, }, { upsert: true });
        console.log('Register user', name);
    }
}

module.exports = {
    initUser
};