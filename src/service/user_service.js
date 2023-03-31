const configEnv = require("../config/env");
const user = require('../model/user');
const { md5 } = require('../utils/encrypt');
const logger = require('../utils/logger')
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
            logger.info('Register user', name);
        } else {
            await user.findOneAndUpdate({ name }, { password, role, })
            logger.info('update user', name);
        }
    }
}

module.exports = {
    initUser
};