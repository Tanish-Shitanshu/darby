import { buildServer } from './server';

const port = Number(process.env.PORT || 4000);
const { http } = buildServer();

http.listen(port, () => {
  console.log(`Darby server on http://localhost:${port}  (health: /health, ws: /ws)`);
});
