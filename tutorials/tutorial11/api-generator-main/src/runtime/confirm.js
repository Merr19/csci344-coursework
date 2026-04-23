const readline = require("readline");

async function confirmDestructiveAction(argv, message) {
  if (argv.includes("--yes")) {
    return true;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(`${message} Re-run with --yes to confirm in non-interactive mode.`);
  }

  const answer = await askQuestion(`${message} Type "yes" to continue: `);
  return answer.trim().toLowerCase() === "yes";
}

function askQuestion(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

module.exports = {
  confirmDestructiveAction,
};
