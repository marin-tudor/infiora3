import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import tokenTypes from '../token/token.types';
import config from '../../config/config';
import User from '../user/user.model';
import { IPayload } from '../token/token.interfaces';

const cookieExtractor = (req: any) => {
  let token = null;
  if (req && req.signedCookies) {
    token = req.signedCookies.accessToken;
  }

  return token;
};

const jwtStrategy = new JwtStrategy(
  {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
  },
  async (payload: IPayload, done) => {
    try {
      if (payload.type !== tokenTypes.ACCESS) {
        throw new Error('Invalid token type');
      }
      const user = await User.findById(payload.sub);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
);

export default jwtStrategy;
