import { Redirect, type Href } from "expo-router";

export default function PaymentReturnScreen() {
  return <Redirect href={"/checkout" as Href} />;
}
