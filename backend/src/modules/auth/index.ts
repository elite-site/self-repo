export * from './auth.types';
export * from './auth.schemas';
export * from './auth.repository';
export * from './auth.service';
export {
  authorize,
  googleCallback,
  studentLogout,
  adminLogin as adminLoginHandler,
  adminLogout as adminLogoutHandler,
  adminMe as adminMeHandler,
} from './auth.controller';
export * from './auth.routes';
export { default } from './auth.routes';
