import supabase from "../lib/supabase_client.js";
import { checkCookieState, createCookie } from "../lib/supabase-cookie.js";

export async function autoHanler(req, res){

    // get the Authorization header;
    const rewAuthorization = req.headers.authorization;

    // if no Authorization found, send back 401,
    if(!rewAuthorization) return respondUnauthorized(res, 'missing Authorization header,');

    // if Authorization does not match the expected pattren, send back 401,
    if(!rewAuthorization.startsWith('Basic '))return respondUnauthorized(res, 'wrong Authorization pattern,')

    // grab the password -- remove the prefix
    const encodedReqPassword = rewAuthorization.replace('Basic ', '');
    const passwrod = process.env.data_password;
    
    // decode the base64,
    const reqPassword = Buffer.from(encodedReqPassword, 'base64').toString();
    


    if(reqPassword === passwrod){

    const newCookie = await createCookie(true);
    // try to take the new cookie,
    if(newCookie.success && !newCookie.error && newCookie.message){

        respondWithData(req, res, newCookie.message)
    }else{

        // if there isn't ok, log the response, and cuntinue without cookie,
        console.log(newCookie)
        respondWithData(req, res)
    }

    }else{

        // if the password is incorrect, send 401,
        return respondUnauthorized(res, 'password does not match,');

    }
}

// 401 responder,
function respondUnauthorized(res, error){

    if(error) console.log(error);
    res.status(401);
    res.json({error: 'Unauthorized'});
    res.end();

}

// 200 responder
async function respondWithData(req, res, cookie){

    // first get the items query pram,
    let itemsQuery = req.query.items;
    // console.log(itemsQuery);

    // var for id array, empty at default,
    let target_ids = [];

    if(itemsQuery){
        // should come in json string,
        // TODO: check for incorect formats, that can lead to errors,
        itemsQuery = JSON.parse(itemsQuery);

        // grab the item key,
        itemsQuery.forEach(element => {
            target_ids.push(element.id);
        });
    }

    const dbRespond = await supabase.rpc('get_nested_inventory', {target_ids: target_ids});
    if(dbRespond.error) console.log(dbRespond);
    res.status(200);
    if(cookie) res.setHeader('Set-Cookie', `__Host-sesion_=${cookie}; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; Secure; Path=/`);
    res.json(dbRespond.data);
    res.end();

}

//--------------------------------------------------
// this function need to check first if the authrization is set, 
// if it is, then dont look for a cookie, go straight to the aothurization function.
// if itnot, then check for a cookie,
// if there is a cookie, send to the cookie maneger,
// if it autorized, rspond with the 200 responrder,
// ohter wise use the 401.
export default async function handler(req, res){

    // get the Authorization header;
    const rewAuthorization = req.headers.authorization;

    // if it is, then dont look for a cookie, go staight to the aothurization function.
    if(rewAuthorization) return autoHanler(req, res);

    const rewCookie = req.cookies;

    // extrect the __Host-sesion_ cookie,
    const idCookie = rewCookie ? rewCookie["__Host-sesion_"] : null;

    // if no such a cookie, respond 401,
    if(! idCookie){
        return respondUnauthorized(res);

        // else, check if the cookie exist in the DB and its autorized,
    }else{

        const dbResponse = await checkCookieState(idCookie);

        // if there is en error in the response, then return 401,
        if(dbResponse.error){

            return respondUnauthorized(res, `${dbResponse.message} id ${dbResponse.id}`);

        // make sure evry thing looks good, return 200,
        }else if(dbResponse.success && dbResponse.verified){
        
            respondWithData(req, res)

        // else = cookie was wrong or not verifeid, sen 401,
        }else{
        
            respondUnauthorized(res, `wrong cookie or not aoturized id ${dbResponse.id}`)
        }
    }


}