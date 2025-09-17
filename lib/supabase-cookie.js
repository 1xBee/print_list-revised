import supabase from "./supabase_client.js";

export async function checkCookieState(cookie){

    // First check if we got a cookie at the function call,
    if(!cookie || cookie.toString().trim().length === 0){
        return returnHandler(false, null, null, 'cookie argument is requred', true);
    }

    // Wrep in a try catch,
    try{
        // Fatch the DB,
        const dbResponse = await supabase
            .from('user_cookies')
            .select()
            .eq('cookie_string', cookie);

        // check for errors in the db respond,
        if(dbResponse.error){

            console.log(dbResponse);
            return returnHandler(false, null, null, '"internal" error fatchng the db: ' + dbResponse.error.message, true);

        // check if the cookie was found,
        }else if(dbResponse.data.length > 0){

            return returnHandler(true, dbResponse.data[0].record_id, dbResponse.data[0].is_verified, '', false)
        
        // must be not found,
        }else{

            return returnHandler(false, null, null, 'cookie not found', false);
        }

    }catch (error){
        console.error();
        return returnHandler(false, null, null, '"extrenal" error fatchng the db: ' + error, true);
    }
    
}

// function to create a cookie,
export async function createCookie(verified = false){

    // make sure we got the right pram,
    if(typeof verified !== "boolean") return returnHandler(false, null, null, 'type of "verified" most be a bool', true);

    try{
        const dbResponse = await supabase
            .from('user_cookies')
            .insert({is_verified: verified})
            .select();

        const firstRow = dbResponse.data[0];

        // check for errors in the db respond,
        if(dbResponse.error){

            console.log(dbResponse);
            return returnHandler(false, null, null, '"internal" error fatchng the db: ' + dbResponse.error.message, true);
        
            // if the dbResponse is ok, return the data,
        }else{

            return returnHandler(true, firstRow.record_id, firstRow.is_verified, firstRow.cookie_string, false);

        }

    }catch (error){
        console.error();
        return returnHandler(false, null, null, '"extrenal" error fatchng the db: ' + error, true);
    }
}


function returnHandler(success, id, verified, message = '', error){
    return {success, id, verified, message, error}
}

// console.log('\n------function--return-------\n' , await createCookie(true))

