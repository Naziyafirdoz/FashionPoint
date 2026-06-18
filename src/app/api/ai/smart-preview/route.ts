import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { personImage, garmentImage } = await req.json();
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return NextResponse.json({
      comingSoon: true,
      message: "Configure REPLICATE_API_TOKEN to enable virtual try-on"
    });
  }

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      version: "fashn-ai/fashn-vton",
      input: { person_image: personImage, garment_image: garmentImage }
    })
  });

  const data = await res.json();
  return NextResponse.json(data);
}
