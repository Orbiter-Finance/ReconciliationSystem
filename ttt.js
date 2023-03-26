const db = require("./model/index");
const pairTable = require("./target.json");
// const bluebird = req

async function main() {
  const sql = `select * from transaction where transcationId = ?`;
  for (const item of pairTable) {
    // console.log(sql)
    let [result] = await db.query(sql, [item.transcationId]);
    console.log(result);
  }
}

main()