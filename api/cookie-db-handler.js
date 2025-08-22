import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../db.js'

export default async function handelCookie(oldCookie, newCookie) {


    // object will be overwriten truout the function excution
    const returnObj = {
        succes: undefined,
        oldCookieFound: undefined,
        newCookieAdded: undefined,
        isVerified: false,
        message: ''
    }

    try{
        const logs = await db.collection('user-cookies');
        const foundDocs = await logs.where('http-cookie', '==', oldCookie || 'no-such-a-cookie-ffgg').get().then(e => e.docs);

        if(foundDocs.length > 0){

            // we recognize this cookie, make sure only one found,
            if(foundDocs.length  > 1) {
                returnObj.succes = false;
                returnObj.message = 'found 2 the same cookies, exit function';
                /// console.log(returnObj);
                return returnObj;
            }

            const docRef = foundDocs[0].ref

            returnObj.isVerified = 
                await db.runTransaction( async e => {

                    // get the Verified feild from the document
                    const isVerified = await e.get(docRef).then(e => e.get('verified'));
                    
                    // change to the new cookie and push the time stampe
                    await e.update(docRef, {
                        'http-cookie': newCookie, 
                        // FieldValue.arrayUnion to push to an array,
                        'timestamp': FieldValue.arrayUnion(new Date())
                    })
                    // return the verified feild value
                    return isVerified;
                })
            
            returnObj.succes = true;
            returnObj.oldCookieFound = true;
            returnObj.newCookieAdded = true;
            returnObj.message = 'found old cookie and create the new one'

            /// console.log(returnObj);
            return returnObj;

        } else {

            // if the cookie is not found, creat a new doc for that user,
            // the doce id is the current Date() in milliseconds,
            const dateString = new Date().valueOf().toString();
            logs.doc(dateString).set({'http-cookie': newCookie, timestamp: [new Date()]})

            returnObj.succes = true;
            returnObj.oldCookieFound = false;
            returnObj.newCookieAdded = true;
            returnObj.message = 'new cookie created'

            /// console.log(returnObj);
            return returnObj;

        }
        
    } catch (err){

        returnObj.succes = false;
        returnObj.message = `en error accurs with the function: ${err}`;

        /// console.log(returnObj);
        return returnObj;

    }

}

// handelCookie('hello', 'hello');