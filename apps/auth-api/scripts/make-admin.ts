/**
 * Promueve un usuario a administrador (usuarios.isAdmin = true).
 * Uso: pnpm --filter @kornbeat/auth-api make-admin <email>
 *
 * Es la vía para crear el primer admin (evita huevo-gallina):
 * no hay endpoint público que conceda isAdmin.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { SessionsService } from '../src/sessions/sessions.service';

async function run(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: make-admin <email>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const usersService = app.get(UsersService);
  const sessionsService = app.get(SessionsService);

  const user = await usersService.findCaseInsensitiveByEmail(email);
  if (!user) {
    console.error(`❌ Usuario no encontrado: ${email}`);
    await app.close();
    process.exit(1);
  }

  if (user.isAdmin) {
    console.log(`ℹ️  ${email} ya es administrador`);
    await app.close();
    process.exit(0);
  }

  await usersService.update(user._id.toString(), { isAdmin: true });
  await sessionsService.invalidateUserCache(user._id.toString());

  console.log(`✅ ${email} (${user.name}) ahora es administrador`);
  await app.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error en make-admin:', err);
  process.exit(1);
});
