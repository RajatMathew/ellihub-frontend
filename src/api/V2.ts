import exampleApp from '@modules/_example_';
import { Hono } from 'hono';

const app = new Hono();

app.route('/example', exampleApp);

export default app;
