import { test, expect, request } from '@playwright/test';
import * as dataCreation from "./dataCreation.js";
import * as allure from "allure-js-commons";
import XLSX from 'xlsx';
const fs = require('fs');
const axios = require("axios");
const access_token_path=require("./config.json");
const ACCESS_TOKEN =access_token_path.access_token;
// Replace with the order ID to check
const ORDER_ID = "YOUR_ORDER_ID";

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


    test.describe('Order flow', () => {
  let orderResponse;
  let orderResponseStatus;
  const workbook = XLSX.readFile('./tests/orderInput.csv');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const orders = XLSX.utils.sheet_to_json(sheet);

    const finalRequests =  dataCreation.createDynamicRequestsFromJson(orders);

    test('Create order', async({ request })=> {
  for (const [index, data] of finalRequests.entries()) {

        await allure.step(`Creating order for ID: ${data.id}`, async () => {
  const orderString = JSON.stringify(data, null, 2);
  console.log("Request body",orderString);
  let token=access_token_path.access_token;
  const responseData=await sendRequestOrder(request,token,orderString);
  orderResponse=await responseData.json();
  orderResponseStatus=await responseData.status();
  console.log("responseData",await responseData.json());

expect.soft(
  responseData.status() === 200 || responseData.status() === 201,
  'Status should be 200 or 201').toBeTruthy();

      if(responseData.status()===200 || responseData.status() === 201) {
        if (orderResponse.id !=="") {
      console.log('Order created with status code', responseData.status());
      //console.log('Order created with response ', responseData.json());
          await allure.attachment("Response", responseData.json(), "application/json");

      //console.log("Reference_ID", orderString.purchase_units[0].reference_id);
      console.log("Order ID", orderResponse.id);
     }
  }
  else{
        console.log('Order created with status code', responseData.status());
                console.log('Order created with response ', responseData.json());

        //console.log("Reference_ID", orderString.reference_id);
  }
  });
}
  });


  test('Order creation - Validate the orderID', async()=>
  {
      if(orderResponseStatus===200 || orderResponseStatus === 201)
{
  if (orderResponse.id !=="" || !orderResponse.id) {
    expect.soft(orderResponse.id, 'Order ID must exist').toBeTruthy();
  }
    console.log("Valid Order Id", orderResponse.id);
}
else{
    console.log("Response status", orderResponseStatus);

}
       });

    });




