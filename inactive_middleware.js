// this is not active as of now,
import { NextRequest, NextResponse } from 'next/server.js';
import cookie_create from './lib/cookie-create.js'

export default async function middleware(req) {
  const url = new URL(req.url);

  if(url.pathname === '/' || url.pathname === '/index'){

    const request = new NextRequest(req);

    // get the cookie if its found,
    let reqCookie = request.cookies.get('.id_visiter')
    reqCookie = reqCookie ? reqCookie.value : undefined;

    // creaete an instense of the response,
    const response = NextResponse.next();
    // get the new cookie (and save it to db),
    const data = await cookie_create(reqCookie);
    console.log(data);

    // error,
    if(!data.succes) return errorRespons();

    const uuid = data.value

    response.cookies.set('.id_visiter', uuid, {
      'httpOnly': true,
      'secure': true
    })

    return response;

  }else{
    // this pushes all other request as normal,
    return NextResponse.next();

  }
}

function errorRespons(){

  NextResponse.error()

}

// fixer for the __dirname not defind issue
export const config = {
  runtime: 'nodejs', // This will run your middleware in a Node.js environment
};
