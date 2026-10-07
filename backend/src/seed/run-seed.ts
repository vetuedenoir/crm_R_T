import { NestFactory } from '@nestjs/core';

import { ConfigError, loadConfig } from '../config/index.js';
import { JsonLogger } from '../logging/index.js';

import { parseSeedArgs } from './seed-args.pure.js';
import { SeedCommandModule } from './seed-command.module.js';
import { SeedService } from './seed.service.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const options = parseSeedArgs(process.argv.slice(2), config.nodeEnv);
  if (!options.ok) {
    console.error(options.error);
    process.exitCode = 1;
    return;
  }
  const app = await NestFactory.createApplicationContext(SeedCommandModule, {
    logger: new JsonLogger(),
  });
  try {
    const report = await app.get(SeedService).run(options.value, new Date());
    console.log(
      `Seed terminé : ${String(report.inserted)} contact(s) ajouté(s), ${String(report.total)} au total.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exitCode = 1;
});
