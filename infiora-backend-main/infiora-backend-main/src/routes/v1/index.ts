import express, { Router } from 'express';
import authRoute from './auth.route';
import docsRoute from './swagger.route';
import userRoute from './user.route';
import ticketRoute from './ticket.route';
import batchRoute from './batch.route';
import tagRoute from './tag.route';
import hotelRoute from './hotel.route';
import roomRoute from './room.route';
import linkRoute from './link.route';
import groupRoute from './group.route';
import subscriberRoute from './subscriber.route';
import healthRoute from './health.route';
import ordersRoute from './orders.route';
import housekeepingRoute from './housekeeping.route';
import maintenanceRoute from './maintenance.route';
import staffRoute from './staff.route';
import dispatchRoute from './dispatch.route';
import bookingRoute from './booking.route';
import analyticsRoute from './analytics.route';
import npsRoute from './nps.route';
import stripeRoute from './stripe.route';
import adminRoute from './admin.route';
import config from '../../config/config';

const router = express.Router();

interface IRoute {
  path: string;
  route: Router;
}

const defaultIRoute: IRoute[] = [
  {
    path: '/health',
    route: healthRoute,
  },
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/tickets',
    route: ticketRoute,
  },
  {
    path: '/batches',
    route: batchRoute,
  },
  {
    path: '/tags',
    route: tagRoute,
  },
  {
    path: '/hotels',
    route: hotelRoute,
  },
  {
    path: '/rooms',
    route: roomRoute,
  },
  {
    path: '/links',
    route: linkRoute,
  },
  {
    path: '/groups',
    route: groupRoute,
  },
  {
    path: '/subscribers',
    route: subscriberRoute,
  },
  {
    path: '/orders',
    route: ordersRoute,
  },
  {
    path: '/stripe',
    route: stripeRoute,
  },
  {
    path: '/admin',
    route: adminRoute,
  },
  {
    path: '/housekeeping',
    route: housekeepingRoute,
  },
  {
    path: '/maintenance',
    route: maintenanceRoute,
  },
  {
    path: '/',
    route: staffRoute,
  },
  {
    path: '/',
    route: dispatchRoute,
  },
  {
    path: '/',
    route: bookingRoute,
  },
  {
    path: '/hotels/:hotelId/analytics',
    route: analyticsRoute,
  },
  {
    path: '/',
    route: npsRoute,
  },
];

const devIRoute: IRoute[] = [
  // IRoute available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultIRoute.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devIRoute.forEach((route) => {
    router.use(route.path, route.route);
  });
}

export default router;
