export function looksLikeClashYamlSubscriptionUrl(url: string) {
  const value = url.trim();
  if (!value) {
    return false;
  }

  return (
    /\.ya?ml($|\?)/i.test(value) ||
    /target=clash/i.test(value) ||
    /subconverter/i.test(value) ||
    /format=clash/i.test(value)
  );
}

export function looksLikeRawAirportSubscriptionUrl(url: string) {
  const value = url.trim();
  if (!value) {
    return false;
  }

  return !looksLikeClashYamlSubscriptionUrl(value);
}
