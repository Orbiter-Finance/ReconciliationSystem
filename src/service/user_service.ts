import env from '../config/env'
import user from '../model/user'
import { md5En } from '../utils/encrypt'

export async function initUser() {
    let configEnv: any = env;
    const accountList = configEnv?.account || [];
    for (const account of accountList) {
        const password = md5En(account.password);
        const name = account.name;
        const role = +account.role || 2;
        const count = await user.count({
            name,
        });
        if (!count) {
            await user.create({ name, password, role, status: 1 });
            console.log('Register user', name);
        }
    }
}