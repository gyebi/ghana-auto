import test from "node:test";
import assert from "node:assert/strict";

import {
  getConfiguredDealershipAddress,
  getConfiguredDealershipEmail,
  getConfiguredDealershipMapUrl,
  getConfiguredDealershipPhoneNumber,
} from "../src/lib/dealership-contact.js";

test("dealership phone and email configuration fail safely", () => {
  assert.equal(
    getConfiguredDealershipPhoneNumber("233201234567"),
    "233201234567"
  );
  assert.equal(getConfiguredDealershipPhoneNumber("+233201234567"), null);
  assert.equal(getConfiguredDealershipPhoneNumber("233 201234567"), null);

  assert.equal(
    getConfiguredDealershipEmail("sales@ghanaauto.example"),
    "sales@ghanaauto.example"
  );
  assert.equal(getConfiguredDealershipEmail("not-an-email"), null);
});

test("location links require an address and safe HTTP destination", () => {
  const address = getConfiguredDealershipAddress("  Accra, Ghana  ");

  assert.equal(address, "Accra, Ghana");
  assert.equal(
    getConfiguredDealershipMapUrl(address, "https://maps.example/ghana-auto"),
    "https://maps.example/ghana-auto"
  );
  assert.equal(getConfiguredDealershipMapUrl(null, "https://maps.example"), null);
  assert.equal(getConfiguredDealershipMapUrl(address, "javascript:alert(1)"), null);
});
