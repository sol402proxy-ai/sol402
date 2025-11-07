import { Hono } from 'hono';
import type { HonoAppEnv } from '../app-context.js';
import { siteRoutes, renderHome } from '../site/pages.js';

const site = new Hono<HonoAppEnv>();

site.get('/', (c) => c.html(renderHome()));

for (const route of siteRoutes) {
  site.get(route.path, (c) => c.html(route.render()));
}

site.get('/link', (c) => c.redirect('/link/request', 301));

export default site;
