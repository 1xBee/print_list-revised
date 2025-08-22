import { NextRequest, NextResponse } from 'next/server.js';

export default async function middleware(req) {
  const url = new URL(req.url);

  // // do not fire on api calls
  // if (url.pathname.startsWith('/api')) return NextResponse.next();

  if(url.pathname === '/' || url.pathname === '/index'){

    const request = new NextRequest(req);
    //console.log(request.cookies.get('.id_visiter'));
    let reqCookie = request.cookies.get('.id_visiter')
    reqCookie = reqCookie ? reqCookie.value : undefined;
    //console.log(reqCookie);
    
    const response = NextResponse.next();

    const result = await fetch(`${url.origin}/api/cookie-create`, {
      method: 'POST', 
      headers: {'content-type': 'application/json'}, body: JSON.stringify({reqCookie: reqCookie})    
    })
    
    const data = await result.json()
    console.log(data);

    if(!data.succes) return errorRespons();

    const uuid = data.value
    // console.log(uuid)

    response.cookies.set('.id_visiter', uuid, {
      'httpOnly': true,
      'secure': true
    })

    return response;

  }else{

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
