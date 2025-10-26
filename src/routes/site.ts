import { Hono } from 'hono';
import type { HonoAppEnv } from '../app-context.js';
import { siteRoutes } from '../site/pages.js';

const site = new Hono<HonoAppEnv>();

for (const route of siteRoutes) {
  site.get(route.path, (c) => c.html(route.render()));
}

export default site;
