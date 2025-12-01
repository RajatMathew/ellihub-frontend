import { Hono } from 'hono';
import { ExampleUtil } from '@utils';

const app = new Hono();

app.get('/', (c) => {
  const text = ExampleUtil('Hello from ExampleUtil!');
  const text2 = 'Hello, World!';
  console.log(text2);
  return c.text(text);
});

export default app;
