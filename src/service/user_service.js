const configEnv = require("../config/env");
const user = require('../model/user');
const { md5 } = require('../utils/encrypt');

async function initUser() {
    const accountList = configEnv?.account || [];
    for (const account of accountList) {
        const password = md5(account.password);
        const name = account.name;
        const role = +account.role || 2;
        const count = await user.count({
            name,
        });
        if (!count) {
            await user.create({ name, password, role, status: 1 });
            console.log('Register user', name);
        } else {
            await user.findOneAndUpdate({ name }, { password, role, })
            console.log('update user', name);
        }
    }
}

module.exports = {
    initUser
};