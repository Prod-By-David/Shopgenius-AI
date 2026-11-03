import type { LoginError } from "@shopify/shopify-app-remix/server";
import { LoginErrorType } from "@shopify/shopify-app-remix/server";

interface LoginErrorMessage {
  shop?: string;
}

export function loginErrorMessage(loginErrors: LoginError): LoginErrorMessage {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return { shop: "Introduce el dominio de tu tienda" };
  } else if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return { shop: "Introduce un dominio de tienda válido" };
  }
  return {};
}
