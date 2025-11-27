const redis = require('redis');

// Agregar logs para depuración en la consola
console.log('[GuestAccessControl] Middleware inicializado');

const client = redis.createClient();

client.on('error', (err) => {
  console.error('[GuestAccessControl] Error en la conexión con Redis:', err);
});

const guestAccessControl = async (req, res, next) => {
  try {
    console.log('[GuestAccessControl] Middleware ejecutado para la ruta:', req.originalUrl);

    const uuid = await import('uuid'); // Importación dinámica de uuid
    const uuidv4 = uuid.v4;

    const authToken = req.headers['authorization']; // Token de autenticación (si existe)

    if (authToken) {
      // Si el usuario está autenticado, permitir el acceso directamente
      console.log('[GuestAccessControl] Usuario autenticado, acceso permitido');
      return next();
    }

    const guestToken = req.headers['guest-token']; // Token de invitado
    console.log('[GuestAccessControl] Token de invitado recibido:', guestToken);

    if (!guestToken) {
      // Si no hay token de invitado, generar uno temporal
      const newGuestToken = uuidv4();
      console.log('[GuestAccessControl] Generando token temporal para invitado:', newGuestToken);

      client.setex(`guest_token:${newGuestToken}`, 60, 'guest', (err) => {
        if (err) {
          console.error('[GuestAccessControl] Error al guardar el token en Redis:', err);
          return res.status(500).send('Error interno del servidor');
        }
        console.log('[GuestAccessControl] Token temporal generado y almacenado en Redis:', newGuestToken);
        return res.status(200).json({
          message: 'Acceso temporal concedido',
          token: newGuestToken,
        });
      });
    } else {
      // Verificar si el token de invitado es válido
      console.log('[GuestAccessControl] Verificando token de invitado:', guestToken);
      client.get(`guest_token:${guestToken}`, (err, value) => {
        if (err) {
          console.error('[GuestAccessControl] Error al verificar el token en Redis:', err);
          return res.status(500).send('Error interno del servidor');
        }

        if (!value) {
          // El token ha expirado o no es válido
          console.warn('[GuestAccessControl] Token de invitado expirado o inválido:', guestToken);
          return res.status(403).json({
            message: 'El tiempo de acceso como invitado ha expirado. Regístrate para continuar.',
          });
        }

        // El token es válido, permitir el acceso
        console.log('[GuestAccessControl] Token de invitado válido, acceso permitido:', guestToken);
        next();
      });
    }
  } catch (error) {
    console.error('[GuestAccessControl] Error en el middleware de control de acceso:', error);
    res.status(500).send('Error interno del servidor');
  }
};

module.exports = guestAccessControl;