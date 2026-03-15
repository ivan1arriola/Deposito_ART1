import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

process.stdout.write("Claves VAPID generadas.\n\n");
process.stdout.write("Agrega estas lineas a tu .env y reinicia la app:\n\n");
process.stdout.write(`WEB_PUSH_PUBLIC_KEY="${publicKey}"\n`);
process.stdout.write(`WEB_PUSH_PRIVATE_KEY="${privateKey}"\n`);
process.stdout.write('WEB_PUSH_SUBJECT="mailto:admin@example.com"\n');
