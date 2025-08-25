import { FieldValue } from 'firebase-admin/firestore';
import { db } from './db.js'

// object will be overwriten truout the function excution
const returnObj = {
    succes: undefined,
    oldCookieFound: undefined,
    newCookieAdded: undefined,
    isVerified: false,
    message: ''
}

// tha main collection
const logs = await db.collection('user-cookies');

export default async function handelCookie(oldCookie, newCookie) {


    try{

        if(!oldCookie){
            // if no old cookie was sent, then go ahead and create one
            await createNewCookie(newCookie);

        }else{

            // if a old cookie was sent, check if this exists in our record,
            const foundDocs = await logs.where('http-cookie', '==', oldCookie).get().then(e => e.docs);

            if(foundDocs.length > 0){

                // we recognize this cookie, make sure only one found,
                if(foundDocs.length  > 1) {

                    // found 2 users with the same cookie, something is wrong in hear,
                    returnObj.succes = false;
                    returnObj.message = 'found 2 the same cookies, exit function';

                }else{

                    // found only one user wth that cookie, go ahead and update the db with the new log,
                    const docRef = foundDocs[0].ref

                    await updateCookie(docRef, newCookie)

                }

            } else {

                // if old cookie was sent but its not found, create a new one for that
                await createNewCookie(newCookie);

            }

        }
        
    } catch (err){

        returnObj.succes = false;
        returnObj.message = `en error accurs with the function: ${err}`;

    }

    // finelly return the reti=urn object that we have build truout the function
    return returnObj
}

async function updateCookie(docRef, newCookie){

    const isVerified = await db.runTransaction(async e => {
        const tempDoc = await e.get(docRef);
        const isVerified = await tempDoc.get('verified');
        e.update(docRef, {
            'http-cookie': newCookie, 
            // FieldValue.arrayUnion to push to an array,
            'timestamp': FieldValue.arrayUnion(new Date())
        })
        return isVerified;
    })

    returnObj.succes = true;
    returnObj.oldCookieFound = true;
    returnObj.newCookieAdded = true;
    returnObj.isVerified = isVerified;
    returnObj.message = 'found old cookie and create the new one';
}


async function createNewCookie(newCookie){

    // the doc id is the current Date() in milliseconds,
    const dateString = new Date().valueOf().toString();

    await logs.doc(dateString).set({
        'http-cookie': newCookie,
        timestamp: [new Date()],
        verified: false
    })

    returnObj.succes = true;
    returnObj.oldCookieFound = false;
    returnObj.newCookieAdded = true;
    returnObj.message = 'new cookie created'

}