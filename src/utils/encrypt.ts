import jwt from 'jsonwebtoken'
import md5 from 'md5'
import env from '../config/env'

const salt = 'asdfqwer123#';
const privateKey = env.encryptPrivateKey;

export async function encrypt(data: any) {
    return jwt.sign({ data: (data + salt) }, privateKey, { expiresIn: '24h' });
}

export async function decrypt(token: string) {
    try {
        const data:any = jwt.verify(token, privateKey);
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

export function md5En(pwd: string) {
    return md5(pwd + privateKey);
}