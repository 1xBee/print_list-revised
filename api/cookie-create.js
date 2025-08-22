import {v4 as uuidv4} from 'uuid';
import cookie_db_handler  from './cookie-db-handler.js'

export default async function createCookie(req, res){
    const reqCookie = req.body.reqCookie;
    // console.log('the cookie is ' + reqCookie.reqCookie)
    const uuid = uuidv4();
    const resolt = await cookie_db_handler(reqCookie, uuid);
    resolt.value = uuid; // add the new cookie to the response obj,
    res.json(resolt);
}
// createCookie();
