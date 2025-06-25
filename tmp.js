/* eslint-disable */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function test() {
  let result = sleep(1000);
  console.log(result);
}

test()