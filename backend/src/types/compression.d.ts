declare module 'compression' {
  import { RequestHandler, Request, Response } from 'express';
  function compression(options?: any): RequestHandler;
  namespace compression {
    function filter(req: Request, res: Response): boolean;
  }
  export = compression;
}
