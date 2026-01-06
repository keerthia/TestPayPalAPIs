export  function createDynamicRequestsFromJson(records) {
    const requests = [];
    const MAX_REFERENCES = 100; // Safe guard against extreme data or bad formatting

    /*for (const record of records) {
      const request = {
        intent: record.intent,
        purchase_units: []
      };
    let i=1;
    let foundReference = true;

      // Loop dynamically, checking for reference IDs up to the maximum limit
      while (foundReference && i <= MAX_REFERENCES)
      {
      let refIdKey = `reference${i}_id`;
      const currencyKey = `currency_code${i}`;
      const valueKey = `value${i}`;
      const amountKey = `amount${i}`;
      console.log(refIdKey);
        // 1. Check for a valid reference ID. The '!' converts the value to a boolean
        // and checks if it's falsy (null, undefined, or empty string "")
        const referenceId = record[refIdKey];
        console.log(referenceId);


        if (!referenceId) {
          // Stop the loop and do not include the current (null) reference
          foundReference = false;
          break;
        }
      const purchaseUnitObject = {
          // Use a standard name for the field: reference_id
          "reference_id": referenceId,

          // Use a standard name for the object: amount
          "amount": {
            "currency_code": record[currencyKey],
            "value": record[valueKey].toString()
          }
        };

        // 2. If the reference ID is valid, add the fields dynamically
        request.purchase_units.push(purchaseUnitObject);

        i++; // Move to the next reference index
      }
  console.log("Request",request);
      // Only push the request if we found at least one reference (i > 1)
          requests.push(request);

    }*/

    for (const record of records) {
        // 2. Map flat CSV data to your nested JSON structure
        const paymentPayload = {
          intent: record.intent,
          purchase_units: [
            {
              reference_id: record.reference_id,
              amount: {
                currency_code: record.currency_code,
                value:Number(record.value).toFixed(2)
              }
            }
          ]
        };
        console.log("paymentPayload", paymentPayload);
         requests.push(paymentPayload);
        }

    return requests;
  }



