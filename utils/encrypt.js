const jwt = require("jsonwebtoken");

const env = require('../config/env');

const salt = 'asdfqwer123#';
const privateKey = env.encryptPrivateKey;

module.exports = {
    async encrypt(data) {
        return jwt.sign({ data: (data + salt) }, privateKey, { expiresIn: '24h' });
    },
    async decrypt(token) {
        try {
            const data = jwt.verify(token, privateKey);
            return {
                baseInfo: data.data.split(salt).join(''),
                token: true
            };
        } catch (err) {
            return {
                baseInfo: err,
                token: false
            };
        }
    }
};
