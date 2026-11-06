// Sets a new password for a staff account and unlocks it.
// Usage: npm run admin:reset-password            (asks for the email and the new password)
//        npm run admin:reset-password -- someone@example.com
import readline from "node:readline";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Print the prompt once, then echo nothing while the password is typed.
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const prisma = new PrismaClient();
try {
  const email = (process.argv[2] || (await ask("Staff email [admin@addeinternational.com]: ")) || "admin@addeinternational.com").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const all = await prisma.user.findMany({ select: { email: true } });
    console.error(`No staff account for ${email}. Existing accounts: ${all.map((u) => u.email).join(", ") || "none"}`);
    process.exit(1);
  }
  const password = await ask("New password (8+ characters, hidden): ", true);
  if (password.length < 8) { console.error("Password must be at least 8 characters."); process.exit(1); }
  const again = await ask("Type it again: ", true);
  if (again !== password) { console.error("The two passwords don't match. Nothing changed."); process.exit(1); }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      failedLogins: 0,
      lockedUntil: null,
      active: true,
      sessionVersion: { increment: 1 }, // signs out any old sessions
    },
  });
  console.log(`Password updated for ${email}. Sign in at /admin.`);
} finally {
  await prisma.$disconnect();
}
