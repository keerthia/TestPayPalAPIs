import { test, expect, request } from '@playwright/test';
import * as dataCreation from "./dataCreation.js";
import * as allure from "allure-js-commons";
import XLSX from 'xlsx';
const fs = require('fs');
const axios = require("axios");
const access_token_path=require("./config.json");
const ACCESS_TOKEN =access_token_path.access_token;

const apiResponsesMap = new Map();
const apiResponsesStatusMap = new Map();
let finalRequests;


async function validatePayPalOrder(orderId) {
  try {
    const url = `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const data = response.data;

    console.log("Full response:", data);

    // Basic validation
    if (!data.status) {
      throw new Error("Missing status field in response");
    }

    if (!data.payer || !data.payer.status) {
      throw new Error("Missing payer status");
    }

    // check if order is completed
    if (data.status === "COMPLETED") {
      console.log("Payment completed successfully");
    } else {
      console.log(`Payment status: ${data.status}`);
    }

    // check payer account status
    const accountStatus = data.payer.status; // sometimes "UNVERIFIED" or "VERIFIED"
    console.log(`Payer account status: ${accountStatus}`);

    if (accountStatus === "UNVERIFIED") {
      console.log("Payer account is unverified");
    } else if (accountStatus === "VERIFIED") {
      console.log("Payer account is verified");
    }

  } catch (error) {
    console.error("Error validating PayPal order:", error.message);
  }
}

async function sendRequestOrder(request,token,orderString){
const createOrderResponse=await request.post("https://api-m.sandbox.paypal.com/v2/checkout/orders",{
  headers: {
            'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
             },
             data:orderString
  });
  return createOrderResponse;
  }

  test.beforeAll(async ({ request }) => {
    let orderResponse;
      const workbook = XLSX.readFile('./tests/orderInput.csv');
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const orders = XLSX.utils.sheet_to_json(sheet);


      finalRequests =  dataCreation.createDynamicRequestsFromJson(orders);
      console.log("finalRequests.length()", finalRequests.length);
            for (const [index, data] of finalRequests.entries()) {
                const orderString = JSON.stringify(data, null, 2);
                console.log("Request body",orderString);
                let token=access_token_path.access_token;
                const responseData=await sendRequestOrder(request,token,orderString);
                orderResponse=await responseData.json();
                console.log("responseData",await responseData.json());
                await apiResponsesMap.set(index,orderResponse);
                await apiResponsesStatusMap.set(index,responseData.status());

            }
});

//Order Creation
test.describe('Order flow', () => {


  test('Order - Validate the response', async({ request })=> {
  for (const [index, data] of finalRequests.entries()) {
  let status=apiResponsesStatusMap.get(index);
  let responseOrder=apiResponsesMap.get(index);
    await allure.step(`Order - Validate the response for data ${index}`, async () => {
    expect.soft(
        status === 200 || status === 201 || status === 422,
        'Status should be valid 200 or 201 or 422').toBeTruthy();

      if(status===200 || status === 201) {
      //Run only when id EXISTS and is NOT empty
        if (responseOrder?.id) {
            console.log('Order created with status code', status);
            await allure.attachment("Response - Order Id exists", JSON.stringify(responseOrder, null, 2), "application/json");
            //orderIds.push(orderResponse.id);
            //responseJson=await responseData.json();
        }
      }
  else if(status===422){
        console.log('Order created with status code', status);
        //responseJson=await responseData.json();
        await allure.attachment("Response - Order Id doesnt exist - Invalid Input", JSON.stringify(responseOrder, null, 2), "application/json");
  }
  else{
   console.log('Order created with status code', status);
   console.log('Order created with response ', responseOrder);
   await allure.attachment("Response - Invalid Input", JSON.stringify(responseOrder, null, 2), "application/json");
  }
  });
}
  });


  test('Order creation - Validate the orderID', async()=>
  {
    for (const [key, order] of apiResponsesMap.entries()) {
        //console.log("In Validate the orderID",order.id);
       const order=await apiResponsesMap.get(key);
        console.log("Order from  Validate the orderID",order);
        const responseStatus=apiResponsesStatusMap.get(key);
            if(responseStatus===200 || responseStatus === 201) {
              if (order?.id) {
                    await allure.step(`Validate order ID:${key} ${order.id}`, async () => {
                    expect.soft(order.id.length, 'Order ID Valid')
                      .toBe(17);
                      //expect.soft(order.id, 'Order ID valid').toBeTruthy();
                    //await allure.attachment("Order ID", JSON.stringify(order.id, null, 2), "application/json");
              });
            }

        }
        else{
         await allure.step(`Order ID doesnt exist for input data ${key}     ${order.message}`, async () => {
                  });
        }
    }
  });

 test('Validate that every link contains the corresponding ID', async()=>
 {

    for (const [key, order] of apiResponsesMap.entries()) {
       const responseStatus=apiResponsesStatusMap.get(key);
    if(responseStatus===200 || responseStatus === 201) {
    if(order?.id)
    {
    await allure.step(`ORDER ID ${order.id}`, async () => {
    console.log(`ID in Map: ${key} | Json Response: `,order);
    //console.log(responseValue);
    order.links.forEach(link => {
        expect.soft(link.href,
          `Response Link contains order Id`
        ).toContain(order.id);
        //await allure.attachment("", JSON.stringify(order.id, null, 2), "application/json");
      });
      });
      }
      }
      else
      {
           await allure.step(`Order ID doesnt exist for input data ${key}   ${order.message}`, async () => {
                           });
          }
          }



    });

  test('Order Approval - All Valid Ids should get approved', async({ request })=>{
    for (const [key, order] of apiResponsesMap.entries()) {
        if(order?.id){
            for(const link of order.links){
                 if(link.rel==="approve")
                 {
                    await allure.step(`Approval successful for the ${order.id}`,async () => {
                    console.log("Approving URL:", link.href);
                    const captureResponse = await request.post(link.href);//shows the performance of the page loaded
                    console.log("captureResponse.status()",captureResponse.status());
                    expect.soft(captureResponse.status()).toBe(200);        //window.location.href.open();--Didnt work as the window object is not defined
                 });
                 }
            }
        }
        else
        {
            await allure.step(`Invalid request`, async () => {
                                                                          });
        }
    }
    });
    });





    //expect(apiResponsesMap.get(key).links.href).toContain(orderResponse.id);

    //console.log(`Link ${index + 1} (${link.rel}) validated for ID: ${orderId}`);






