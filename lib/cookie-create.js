import {v4 as uuidv4} from 'uuid';
import cookie_db_handler  from './cookie-db-handler.js'

export default async function createCookie(reqCookie){

    const uuid = uuidv4();
    const result = await cookie_db_handler(reqCookie, uuid);
    result.value = uuid; // add the new cookie to the response obj,
    return result;

}
// createCookie();
