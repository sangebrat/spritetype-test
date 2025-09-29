const { ethers } = require("ethers");
const axios = require("axios");
const crypto = require("crypto");
const readline = require('readline');
require('dotenv').config();

const executionRpc = "https://testnet-rpc.irys.xyz/v1/execution-rpc"
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  console.error('PRIVATE_KEY tidak ditemukan di file .env.');
  process.exit(1);
}

function buildAntiCheatString(address, wpm, accuracy, time, correctChars, incorrectChars) {
  const s = correctChars;
  const i = incorrectChars;
  const l = s + i;
  let n = 0 + 23 * wpm + 89 * accuracy + 41 * time + 67 * s + 13 * i + 97 * l;
  let o = 0;
  for (let t = 0; t < address.length; t++) {
    o += address.charCodeAt(t) * (t + 1);
  }
  n += 31 * o;
  const c = Math.floor(0x178ba57548d * n % Number.MAX_SAFE_INTEGER);
  return `${address.toLowerCase()}_${wpm}_${accuracy}_${time}_${s}_${i}_${c}`;
}

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function submitResult() {
  const provider = new ethers.JsonRpcProvider(executionRpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  const walletAddress = wallet.address;

  const accuracy = 100;
  const time = 15;
  const incorrectChars = 0;

  const correctChars = Math.floor(Math.random() * (82 - 60 + 1)) + 60;

  const wpm = Math.round(correctChars / 5 / (time / 60));

  const timestamp = Date.now();

  const gameStats = {
    wpm,
    accuracy,
    time,
    correctChars,
    incorrectChars,
    progressData: []
  };

  const antiCheatString = buildAntiCheatString(walletAddress, wpm, accuracy, time, correctChars, incorrectChars);
  const antiCheatHash = sha256Hex(antiCheatString).substring(0, 32);

  try {
    const response = await axios.post(
      "https://spritetype.irys.xyz/api/submit-result",
      {
        walletAddress,
        gameStats,
        antiCheatHash,
        timestamp
      }
    );
    console.log("Submit result berhasil:", response.data);
  } catch (error) {
    console.error("Gagal submit result:", error.response ? error.response.data : error.message);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Berapa kali submit? ', async (answer) => {
    const total = parseInt(answer, 10);
    if (isNaN(total) || total < 1) {
      console.log('Input tidak valid.');
      rl.close();
      process.exit(1);
    }
    rl.close();

    for (let i = 0; i < total; i++) {
      console.log(`\n[${i + 1}/${total}] Submit result...`);
      await submitResult();
      if (i < total - 1) {
        console.log('Menunggu 30 detik sebelum submit berikutnya...');
        await delay(30000);
      }
    }
    console.log('\nSelesai.');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Terjadi error:", err);
  process.exit(1);
});

