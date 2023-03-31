import env from './env'
const NODE_ENV = env.NODE_ENV

export const node_env = {
    isLocal: NODE_ENV === "local",
    isDev: NODE_ENV === "development",
    isProd: NODE_ENV === "production"
}