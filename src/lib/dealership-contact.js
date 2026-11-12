const INTERNATIONAL_PHONE_PATTERN = /^[1-9][0-9]{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSafeText(value, maxLength) {
  if (typeof value !== "string") return null;

  const text = value.trim().replace(/\s+/g, " ");
  return text.length > 0 && text.length <= maxLength ? text : null;
}

export function getConfiguredDealershipPhoneNumber(
  value = process.env.DEALERSHIP_PHONE_NUMBER
) {
  return typeof value === "string" && INTERNATIONAL_PHONE_PATTERN.test(value)
    ? value
    : null;
}

export function getConfiguredDealershipEmail(
  value = process.env.DEALERSHIP_EMAIL
) {
  const email = getSafeText(value, 254);

  return email && EMAIL_PATTERN.test(email) ? email : null;
}

export function getConfiguredDealershipAddress(
  value = process.env.DEALERSHIP_ADDRESS
) {
  return getSafeText(value, 300);
}

export function getConfiguredDealershipMapUrl(
  address,
  value = process.env.DEALERSHIP_MAP_URL
) {
  if (!address || typeof value !== "string") return null;

  try {
    const url = new URL(value);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function getDealershipContactDetails() {
  const phoneNumber = getConfiguredDealershipPhoneNumber();
  const email = getConfiguredDealershipEmail();
  const address = getConfiguredDealershipAddress();

  return {
    phoneNumber,
    email,
    address,
    mapUrl: getConfiguredDealershipMapUrl(address),
  };
}
