# maingest

## Variables de entorno

Para ejecutar el proyecto utilizando variables de entorno en lugar de valores fijos, prepara al menos las siguientes variables (puedes definirlas en tu sistema o en un archivo `.env` que luego exportes antes de arrancar la app):

### Backend (Spring Boot)

- `SPRING_DATASOURCE_URL`  
  URL de conexión a la base de datos.  
- `SPRING_DATASOURCE_USERNAME`  
  Usuario de la base de datos.  

- `SPRING_DATASOURCE_PASSWORD`  
  Contraseña de la base de datos.  

- `APP_JWT_SECRET`  
  Clave secreta usada para firmar los JWT. Usa una cadena larga y aleatoria en producción.

- `APP_JWT_EXPIRATION_MS`  
  Tiempo de expiración del token JWT en milisegundos.  
  Ejemplo: `3600000` (1 hora)

#### Certificados SSL en servidor (producción)

El backend está preparado para usar HTTPS con un keystore en formato PKCS12:

- Propiedades relevantes en `application.properties`:
  - `server.ssl.enabled=true`
  - `server.ssl.key-store=classpath:maingest-keystore.p12`
  - `server.ssl.key-store-type=PKCS12`
  - `server.ssl.key-store-password=${SSL_KEYSTORE_PASSWORD:4515aa}`

Pasos recomendados para producción:

1. **Obtener el certificado**  
   - Usa un certificado emitido por una CA pública (por ejemplo, Let’s Encrypt o tu proveedor).  
   - Normalmente tendrás un certificado (`.crt` o `.cer`) y su clave privada (`.key`) o un archivo `.pfx/.p12`.

2. **Crear el keystore PKCS12 (si solo tienes `.crt` + `.key`)**  
   En el servidor (o en tu máquina local) puedes generar un keystore PKCS12, por ejemplo:

   ```bash
   openssl pkcs12 -export \
     -in tu_certificado.crt \
     -inkey tu_clave_privada.key \
     -out maingest-keystore.p12 \
     -name maingest \
     -passout pass:TU_PASSWORD_SSL
   ```

   - Cambia `TU_PASSWORD_SSL` por una contraseña segura (mínimo 6 caracteres).
   - El valor que pongas aquí debe coincidir con `SSL_KEYSTORE_PASSWORD`.

3. **Copiar el keystore al servidor**  
   - Opción A (classpath, como en desarrollo): coloca `maingest-keystore.p12` en  
     `maingest/src/main/resources/` antes de compilar el JAR.  
   - Opción B (ruta externa, recomendado en producción):  
     - Copia `maingest-keystore.p12` a una ruta fuera del JAR, por ejemplo:  
       `/etc/maingest/maingest-keystore.p12`  
     - Cambia `server.ssl.key-store` para apuntar a esa ruta:

       ```properties
       server.ssl.key-store=file:/etc/maingest/maingest-keystore.p12
       ```

4. **Configurar la contraseña del keystore**  
   - Define la variable de entorno `SSL_KEYSTORE_PASSWORD` en el servidor:

     ```bash
     export SSL_KEYSTORE_PASSWORD=TU_PASSWORD_SSL
     ```

   - En Windows puedes configurarla en las variables de entorno del sistema.

5. **Arrancar el backend en el servidor**  
   - Una vez copiado el keystore y configurada la variable `SSL_KEYSTORE_PASSWORD`, arranca el JAR:

     ```bash
     java -jar maingest.jar
     ```

   - El backend escuchará en `https://TU_DOMINIO:8080` (o el puerto que definas en `server.port`).

> En entornos más avanzados puedes terminar TLS en un proxy (Nginx, Apache, etc.) y dejar Spring Boot en HTTP interno. Si haces eso, desactiva `server.ssl.enabled` y configura los certificados únicamente en el proxy.

#### Login con Google

Estas variables se usan en la configuración OAuth2 de Spring:

- `GOOGLE_CLIENT_ID`  
  Client ID de tu aplicación de Google.

- `GOOGLE_CLIENT_SECRET`  
  Client secret de tu aplicación de Google.

#### Login con Microsoft

- `MICROSOFT_CLIENT_ID`  
  Client ID de tu aplicación registrada en Azure AD / Microsoft Entra.

- `MICROSOFT_CLIENT_SECRET`  
  Client secret de tu aplicación de Microsoft.

> Asegúrate de configurar en los paneles de Google y Microsoft las URL de redirección que usa Spring Boot, por ejemplo:  
> `http://localhost:8080/login/oauth2/code/google` y `http://localhost:8080/login/oauth2/code/microsoft`.

### Frontend (Vite/React)

En desarrollo local actualmente asumimos:

- Backend en `http://localhost:8080`
- Frontend en `http://localhost:5173`

Si cambias estos puertos o dominios, actualiza también las URLs usadas en las páginas de login y en la configuración de OAuth2 del backend.

#### Servir el frontend por HTTPS en producción

En producción la forma recomendada de exponer el frontend por HTTPS es:

1. **Construir los archivos estáticos**  

   En el directorio `frontend`:

   ```bash
   npm install
   npm run build
   ```

   Esto genera el contenido estático en `frontend/dist`.

2. **Servir `dist` con un servidor web con SSL**  

   Usa Nginx, Apache o el servidor que prefieras:

   - Configura el virtual host para tu dominio (por ejemplo `https://app.tudominio.com`).
   - Apunta la raíz del sitio (`root` o equivalente) al directorio `dist`.
   - Configura el certificado TLS (por ejemplo Let’s Encrypt) en el servidor web.

   De esta forma:

   - El **frontend** (archivos estáticos) se sirve por `https://app.tudominio.com`.
   - El **backend** puede ir detrás del mismo dominio (proxy inverso) o en otro subdominio.

3. **Alinear URLs frontend/backend**  

   - Asegúrate de que el frontend apunte al dominio/puerto HTTPS correcto del backend (variable `VITE_BACKEND_URL` o configuración equivalente).
   - En el backend, ajusta `app.frontend.base-url` para que coincida con la URL pública del frontend, por ejemplo:

     ```properties
     app.frontend.base-url=https://app.tudominio.com
     ```

#### HTTPS en desarrollo local (opcional)

Si necesitas levantar el frontend en `https://localhost:5173` para pruebas locales:

1. Genera o instala un certificado para `localhost` (puede ser autofirmado).
2. Ajusta `frontend/vite.config.js` para activar `server.https` apuntando a tu `key` y `cert`.
3. El navegador marcará el certificado como no confiable si es autofirmado, por lo que tendrás que confiarlo manualmente.

Esto solo se recomienda para pruebas; en producción debes usar un certificado válido emitido por una CA.
