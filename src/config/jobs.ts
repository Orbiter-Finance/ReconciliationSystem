import schedule from 'node-schedule'
const rule = new schedule.RecurrenceRule();
type Job = {
    name: string,
    cron: string,
    enable: boolean,
    timeZone?: string
}

const jobs: Job[] = [
    {name: 'startFetch', cron: '*/30 * * * * *', enable: true },
    {name: 'startCheck', cron: '*/30 * * * * *', enable: true },
    {name: 'startMatch2', cron: '*/30 * * * * *', enable: true },
    {name: 'fetchInvalidTransaction', cron: '*/30 * * * * *', enable: true },
    {name: 'fetchAbnormalOutTransaction', cron: '*/30 * * * * *', enable: true },
    {name: 'matchInvalidReceiveTransaction', cron: '*/40 * * * * *', enable: true },
    {name: 'checkAbnormalOutTransaction', cron: '*/50 * * * * *', enable: true },
]
export default jobs