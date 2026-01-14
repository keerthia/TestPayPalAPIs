import { test, expect, request } from '@playwright/test';
import * as dataCreation from "./dataCreation.js";
import * as allure from "allure-js-commons";
import XLSX from 'xlsx';
const fs = require('fs');
const axios = require("axios");
const access_token_path=require("./config.json");
const ACCESS_TOKEN =access_token_path.access_token;


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



//Order Creation
test.describe('Order flow', () => {

    let orderResponse;
    const workbook = XLSX.readFile('./tests/orderInput.csv');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const orders = XLSX.utils.sheet_to_json(sheet);

    const finalRequests =  dataCreation.createDynamicRequestsFromJson(orders);
    console.log("finalRequests.length()", finalRequests.length);
    const orderIds = new Array([finalRequests.length]);
    const orderResponseStatus = new Array([finalRequests.length]);
    const apiResponsesMap = new Map();
    const apiResponsesStatusMap = new Map();

  test('Create order successfully and Validate the response', async({ request })=> {
    for (const [index, data] of finalRequests.entries()) {
    await allure.step(`Creating order for ID: ${index}`, async () => {
    const orderString = JSON.stringify(data, null, 2);
    console.log("Request body",orderString);
    let token=access_token_path.access_token;
    const responseData=await sendRequestOrder(request,token,orderString);
    orderResponse=await responseData.json();
    console.log("responseData",await responseData.json());
    apiResponsesStatusMap.set(index,responseData.status());
    expect.soft(
        responseData.status() === 200 || responseData.status() === 201 || responseData.status() === 422,
        'Status should be valid 200 or 201 or 422').toBeTruthy();

      if(responseData.status()===200 || responseData.status() === 201) {
        if (orderResponse.id !=="") {
            console.log('Order created with status code', responseData.status());
            await allure.attachment("Response", JSON.stringify(orderResponse, null, 2), "application/json");
            //orderIds.push(orderResponse.id);
            //responseJson=await responseData.json();
            apiResponsesMap.set(index,orderResponse);
        }
      }
  else if(responseData.status()===422){
        console.log('Order created with status code', responseData.status());
        console.log('Order created with response ', orderResponse);
        //responseJson=await responseData.json();
        await allure.attachment("Response", JSON.stringify(orderResponse, null, 2), "application/json");
        apiResponsesMap.set(index,orderResponse);
  }
  else{
   console.log('Order created with status code', responseData.status());
   console.log('Order created with response ', orderResponse);
  }
  });
}
  });


  test('Order creation - Validate the orderID', async()=>
  {
    for (const [key, order] of apiResponsesMap.entries()) {
        const order=await apiResponsesMap.get(key);
        //console.log("Order from  Validate the orderID",order);
        await allure.step(`Validate order ID:${key} ${order.id}`, async () => {
        const responseStatus=apiResponsesStatusMap.get(key);
            if(responseStatus===200 || responseStatus === 201) {
              if (order.id !=="" || !order.id) {
                    expect.soft(order.id, 'Order ID valid').toBeTruthy();
                    //await allure.attachment("Order ID", JSON.stringify(order.id, null, 2), "application/json");
              }
            console.log("OrderID Not empty  ",order.id);

            }
        });
    }
  });

 test('Validate that every link contains the corresponding ID', async()=>
 {

    for (const [key, order] of apiResponsesMap.entries()) {
       await allure.step(`Validate order ID:${key} ${order.id}`, async () => {
       const responseStatus=apiResponsesStatusMap.get(key);
    if(responseStatus===200 || responseStatus === 201) {
    console.log(`ID in Map: ${key} | Json Response: `);
    const responseValue=apiResponsesMap.get(key);
    //console.log(responseValue);
    responseValue.links.forEach(link => {
        expect.soft(link.href,
          `Link href validation for map key ${key}`
        ).toContain(responseValue.id);
        //await allure.attachment("", JSON.stringify(order.id, null, 2), "application/json");
      });
      }
      });
      }
    });


    //expect(apiResponsesMap.get(key).links.href).toContain(orderResponse.id);

    //console.log(`Link ${index + 1} (${link.rel}) validated for ID: ${orderId}`);
  });





