import { Hono } from 'hono';
import type { HonoAppEnv } from '../app-context.js';
import { siteRoutes } from '../site/pages.js';

const site = new Hono<HonoAppEnv>();

for (const route of siteRoutes) {
  site.get(route.path, (c) => c.html(route.render()));
}

site.get('/link', (c) => c.redirect('/link/request', 301));

export default site;
