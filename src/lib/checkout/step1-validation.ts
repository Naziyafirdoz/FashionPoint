import {
  isValidEmail,
  isValidFullName,
  isValidIndianMobile,
  isValidSecondaryMobile
} from "@/lib/checkout/contact-validation";
import { normalizePincode } from "@/lib/shipping/pincode-lookup";

export type CheckoutStep1Field =
  | "name"
  | "phone"
  | "secondary_phone"
  | "email"
  | "house_flat"
  | "street"
  | "landmark"
  | "pincode";

export type Step1FieldError = {
  field: CheckoutStep1Field;
  summaryLabel: string;
  message: string;
};

const FIELD_ORDER: CheckoutStep1Field[] = [
  "name",
  "phone",
  "secondary_phone",
  "email",
  "house_flat",
  "street",
  "landmark",
  "pincode"
];

type ValidateStep1Input = {
  address: {
    name: string;
    phone: string;
    secondary_phone: string;
    email: string;
    house_flat: string;
    street: string;
    landmark: string;
    pincode: string;
  };
  pincodeValidated: boolean;
};

function sortErrors(errors: Step1FieldError[]): Step1FieldError[] {
  return [...errors].sort(
    (a, b) => FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field)
  );
}

export function validateCheckoutStep1(input: ValidateStep1Input): Step1FieldError[] {
  const { address, pincodeValidated } = input;
  const errors: Step1FieldError[] = [];

  if (!isValidFullName(address.name)) {
    errors.push({
      field: "name",
      summaryLabel: "Full Name",
      message: "Please enter your full name."
    });
  }

  if (!address.phone.trim()) {
    errors.push({
      field: "phone",
      summaryLabel: "Primary Mobile Number",
      message: "Please enter your primary mobile number."
    });
  } else if (!isValidIndianMobile(address.phone)) {
    errors.push({
      field: "phone",
      summaryLabel: "Primary Mobile Number",
      message: "Primary mobile must be 10 digits and start with 6, 7, 8, or 9."
    });
  }

  const secondary = address.secondary_phone.trim();
  if (secondary) {
    if (!isValidIndianMobile(secondary)) {
      errors.push({
        field: "secondary_phone",
        summaryLabel: "Secondary Mobile Number",
        message: "Secondary mobile must be 10 digits and start with 6, 7, 8, or 9."
      });
    } else if (!isValidSecondaryMobile(address.phone, secondary)) {
      errors.push({
        field: "secondary_phone",
        summaryLabel: "Secondary Mobile Number",
        message: "Secondary mobile cannot be the same as the primary number."
      });
    }
  }

  if (!address.email.trim()) {
    errors.push({
      field: "email",
      summaryLabel: "Email Address",
      message: "Please enter your email address."
    });
  } else if (!isValidEmail(address.email)) {
    errors.push({
      field: "email",
      summaryLabel: "Email Address",
      message: "Please enter a valid email address."
    });
  }

  if (!address.house_flat.trim()) {
    errors.push({
      field: "house_flat",
      summaryLabel: "Door / House / Flat Number",
      message: "Please enter your door / house / flat number."
    });
  }

  if (!address.street.trim()) {
    errors.push({
      field: "street",
      summaryLabel: "Street / Area",
      message: "Please enter your street or area."
    });
  }

  if (!address.landmark.trim()) {
    errors.push({
      field: "landmark",
      summaryLabel: "Landmark",
      message: "Please enter a nearby landmark."
    });
  }

  const pincode = normalizePincode(address.pincode);
  if (!pincode) {
    errors.push({
      field: "pincode",
      summaryLabel: "Pincode",
      message: "Please enter your pincode."
    });
  } else if (pincode.length !== 6) {
    errors.push({
      field: "pincode",
      summaryLabel: "Pincode",
      message: "Pincode must be 6 digits."
    });
  } else if (!pincodeValidated) {
    errors.push({
      field: "pincode",
      summaryLabel: "Pincode",
      message: "Please enter a valid pincode."
    });
  }

  return sortErrors(errors);
}
