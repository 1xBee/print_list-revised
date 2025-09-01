import supabase from "../lib/supabase_client.js";

export default async function(req, res){

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

    respondWithData(req, res)
/*
        // if every thing is ok, send 200,
        const { data, error } = await supabase.rpc('get_nested_inventory', {target_ids: []});
        if(error) console.log(error);
        res.status(200);
        res.json(data);
        res.end();
*/
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
async function respondWithData(req, res){

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
    res.json(dbRespond.data);
    res.end();

}