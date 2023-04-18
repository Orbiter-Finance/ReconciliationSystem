import moment from 'moment';
import schedule from 'node-schedule';
import jobsConfig from '../config/jobs'
import logger from '../utils/logger';
const lockMap: any = {};
export async function start() {
    const fetchJos = await import('./fetch')
    for (const jobConfig of jobsConfig) {
        if (!jobConfig.enable) {
            logger.info(`job:${jobConfig.name} disable`)
            continue;
        }
        const handleFunction = fetchJos[jobConfig.name] as () => Promise<void>
        if (!handleFunction) {
            logger.info(`job:${jobConfig.name} handle function not found`)
            continue
        }
        logger.info(`create job:${jobConfig.name}, cron:${jobConfig.cron}`)
        schedule.scheduleJob(jobConfig.cron, async () => {
            if (lockMap[jobConfig.name] === true) {
                logger.info(`job ${jobConfig.name} is executing`)
                return
            }
            lockMap[jobConfig.name] = true
            let start = moment().format('YYYY-MM-DD HH:mm:ss');
            logger.info(`start ${jobConfig.name} at ${moment().format('YYYY-MM-DD HH:mm:ss')}`)
            try {
                await handleFunction()
            } catch (error) {
                logger.error(`job ${jobConfig.name} error:`, error)
            }
            lockMap[jobConfig.name] = false
            let end = moment().format('YYYY-MM-DD HH:mm:ss')
            logger.info(`end ${jobConfig.name} : start:${start} end: ${end}`)
        })
    }
}