import { test, expect, request } from '@playwright/test';
import XLSX from 'xlsx';
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./tests/config.json', 'utf8'));
const clientId=process.env.CLIENTID;
const clientSecret=process.env.CLIENTSECRET;

test.describe('Access Token Tests', ()=> {

test('Get the Access token', async({ request })=> {

const clientId=config.clientId;
   const base64 = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

const responseData=await request.post("https://api-m.sandbox.paypal.com/v1/oauth2/token",{
 headers: {
       'Authorization': `Basic ${base64}`,
       'Content-Type': 'application/x-www-form-urlencoded'
     },
     data: 'grant_type=client_credentials'
     });
      const result = await responseData.json();
      expect.soft(responseData.status()).toBe(200);//Using Soft as the tests has to run for the other requests. And this helps in reporting
     if(responseData.status()===200){
      console.log('Access token received with status code', responseData.status());
      console.log('Valid Access Token retrived', result.access_token);
      let access_token=result.access_token;
      console.log('config.access_token',config.access_token);
           config.access_token = access_token;
          // config.expires_at = now + token.expires_in;
           fs.writeFileSync('./tests/config.json', JSON.stringify(config,null,2));
}
else
{
       console.log('Access token received with status code', responseData.status());
}
});

test('Is Access Token Empty or Null', async()=>
{
if (!config.access_token || config.access_token.trim() === "") {
    throw new Error("Access token is null or empty");
  }
  else
  console.log("Access token is not empty or NULL");
  });
});