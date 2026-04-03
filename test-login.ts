import "dotenv/config";
import { LemmyHttp, Login } from "lemmy-js-client";

console.log("BASE:", process.env.LEMMY_BASE_URL);
console.log("USER:", process.env.LEMMY_USERNAME);
console.log("PW: ", process.env.LEMMY_PASSWORD);

const client = new LemmyHttp(process.env.LEMMY_BASE_URL!);

const loginForm: Login = {
  username_or_email: process.env.LEMMY_USERNAME!,
  password: process.env.LEMMY_PASSWORD!,
};
const res = await client.login(loginForm);
console.log("logged in:", !!res.jwt);